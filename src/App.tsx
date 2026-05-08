import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type Ingredient = {
  id: string
  name: string
  amount: string
}

type Recipe = {
  id: string
  name: string
  description: string
  image: string
  ingredients: Ingredient[]
  steps: string[]
  updatedAt: number
}

type RecipeDraft = {
  name: string
  description: string
  image: string
  ingredients: Ingredient[]
  stepsText: string
}

type AppView =
  | { name: 'list' }
  | { name: 'add' }
  | { name: 'detail'; recipeId: string }
  | { name: 'edit'; recipeId: string }

const STORAGE_KEY = 'deok-sun-recipe-book.v1'

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createIngredient = (name = '', amount = ''): Ingredient => ({
  id: createId(),
  name,
  amount,
})

const makeSampleImage = (
  emoji: string,
  title: string,
  startColor: string,
  endColor: string,
) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" rx="36" fill="url(#bg)" />
      <circle cx="300" cy="160" r="88" fill="rgba(255,255,255,0.28)" />
      <text x="300" y="196" text-anchor="middle" font-size="118">${emoji}</text>
      <text x="300" y="338" text-anchor="middle" font-size="34" font-family="Georgia, serif" fill="#2f241f">${title}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const createSeedRecipes = (): Recipe[] => [
  {
    id: createId(),
    name: 'Kimchi Fried Rice',
    description:
      'Spicy, savory fried rice with kimchi, sesame oil, and a jammy egg on top.',
    image: makeSampleImage('🍳', 'Kimchi Fried Rice', '#f6c27a', '#ef8f6f'),
    ingredients: [
      createIngredient('Cooked rice', '2 cups'),
      createIngredient('Kimchi', '1 cup'),
      createIngredient('Gochujang', '1 tbsp'),
      createIngredient('Eggs', '2'),
    ],
    steps: [
      'Warm a skillet with a little oil and sauté chopped kimchi for 2 to 3 minutes.',
      'Add rice and gochujang, then stir-fry until evenly coated and lightly crisp.',
      'Top with a fried egg and finish with sesame oil and sliced scallions.',
    ],
    updatedAt: Date.now(),
  },
  {
    id: createId(),
    name: 'Honey Butter Toast',
    description:
      'A cozy, lightly sweet toast with whipped butter, honey, and a pinch of sea salt.',
    image: makeSampleImage('🍞', 'Honey Butter Toast', '#f8e9b0', '#f5c977'),
    ingredients: [
      createIngredient('Thick-cut bread', '2 slices'),
      createIngredient('Soft butter', '2 tbsp'),
      createIngredient('Honey', '1 tbsp'),
      createIngredient('Sea salt', 'Pinch'),
    ],
    steps: [
      'Toast the bread until golden and crisp at the edges.',
      'Spread butter while warm, then drizzle with honey.',
      'Sprinkle a tiny pinch of sea salt before serving.',
    ],
    updatedAt: Date.now() - 1000,
  },
]

const createEmptyDraft = (): RecipeDraft => ({
  name: '',
  description: '',
  image: '',
  ingredients: [],
  stepsText: '',
})

const createDraftFromRecipe = (recipe?: Recipe): RecipeDraft => {
  if (!recipe) {
    return createEmptyDraft()
  }

  return {
    name: recipe.name,
    description: recipe.description,
    image: recipe.image,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({ ...ingredient }))
        : [],
    stepsText: recipe.steps.join('\n'),
  }
}

const buildRecipeFromDraft = (draft: RecipeDraft, existingId?: string): Recipe => {
  const title = draft.name.trim()
  const ingredients = draft.ingredients.filter(
    (ingredient) => ingredient.name.trim() || ingredient.amount.trim(),
  )
  const steps = draft.stepsText
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean)

  return {
    id: existingId ?? createId(),
    name: title,
    description: draft.description.trim(),
    image:
      draft.image || makeSampleImage('🍽️', title || 'Recipe', '#f3d684', '#f0a2a2'),
    ingredients,
    steps,
    updatedAt: Date.now(),
  }
}

const loadRecipes = (): Recipe[] => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return createSeedRecipes()
    }

    const parsed = JSON.parse(stored) as Recipe[]
    return parsed.length > 0 ? parsed : createSeedRecipes()
  } catch {
    return createSeedRecipes()
  }
}

type RecipeFormViewProps = {
  mode: 'add' | 'edit'
  initialRecipe?: Recipe
  onCancel: () => void
  onSave: (draft: RecipeDraft, existingId?: string) => void
}

function RecipeFormView({ mode, initialRecipe, onCancel, onSave }: RecipeFormViewProps) {
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    createDraftFromRecipe(initialRecipe),
  )
  const [ingredientName, setIngredientName] = useState('')
  const [ingredientAmount, setIngredientAmount] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setDraft((current) => ({
        ...current,
        image: typeof reader.result === 'string' ? reader.result : '',
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleAddIngredient = () => {
    const nextName = ingredientName.trim()
    const nextAmount = ingredientAmount.trim()

    if (!nextName && !nextAmount) {
      return
    }

    setDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, createIngredient(nextName, nextAmount)],
    }))
    setIngredientName('')
    setIngredientAmount('')
  }

  const handleRemoveIngredient = (ingredientId: string) => {
    setDraft((current) => {
      const remaining = current.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId,
      )

      return {
        ...current,
        ingredients: remaining,
      }
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(draft, initialRecipe?.id)
  }

  const ingredientCount = draft.ingredients.length

  return (
    <main className="screen screen--form">
      <div className="panel panel--form">
        <div className="screen-heading">
          <button type="button" className="icon-button" onClick={onCancel}>
            ←
          </button>
          <div>
            <p className="screen-heading__eyebrow">
              {mode === 'add' ? 'Create recipe' : 'Edit recipe'}
            </p>
            <h2>{mode === 'add' ? 'Add Recipe' : 'Edit Recipe'}</h2>
          </div>
        </div>

        <form className="recipe-form" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={handleImageSelect}
          />

          <section className="image-picker">
            <div className="image-picker__preview">
              {draft.image ? (
                <img src={draft.image} alt={draft.name || 'Recipe preview'} />
              ) : (
                <div className="image-placeholder" aria-hidden="true">
                  <span>📷</span>
                </div>
              )}
            </div>

            <div className="image-picker__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => fileInputRef.current?.click()}
              >
                {draft.image ? 'Change Picture' : 'Add Picture'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setDraft((current) => ({ ...current, image: '' }))}
                disabled={!draft.image}
              >
                Remove
              </button>
            </div>
          </section>

          <label className="field">
            <span>Recipe Name</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Tteokbokki"
              maxLength={80}
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              placeholder="A quick note about the recipe, flavor, or serving idea."
            />
          </label>

          <section className="ingredient-editor">
            <div className="section-title-row">
              <div>
                <h3>Ingredients</h3>
                {ingredientCount > 0 && <p>{ingredientCount} added</p>}
              </div>
            </div>

            <div className="ingredient-grid ingredient-grid--labels">
              <span>Add Ingredient</span>
              <span>Add Amount</span>
            </div>

            <div className="ingredient-input-row">
              <input
                value={ingredientName}
                onChange={(event) => setIngredientName(event.target.value)}
                placeholder="Eggs"
              />
              <input
                value={ingredientAmount}
                onChange={(event) => setIngredientAmount(event.target.value)}
                placeholder="2"
              />
              <button
                type="button"
                className="icon-button icon-button--solid"
                onClick={handleAddIngredient}
                aria-label="Add ingredient"
              >
                +
              </button>
            </div>

            <div className="ingredient-added-list">
              {draft.ingredients.map((ingredient) => (
                <div className="ingredient-added-item" key={ingredient.id}>
                  <span>
                    {ingredient.name}
                    {ingredient.name && ingredient.amount ? ' ' : ''}
                    {ingredient.amount}
                  </span>
                  <button
                    type="button"
                    className="ingredient-delete-button"
                    onClick={() => handleRemoveIngredient(ingredient.id)}
                    aria-label={`Delete ${ingredient.name || 'ingredient'}`}
                  >
                    ⊗
                  </button>
                </div>
              ))}
            </div>
          </section>

          <label className="field">
            <span>Instructions</span>
            <textarea
              value={draft.stepsText}
              onChange={(event) =>
                setDraft((current) => ({ ...current, stepsText: event.target.value }))
              }
              rows={7}
              placeholder={'Write one step per line.\n1. Prep ingredients.\n2. Cook.\n3. Serve warm.'}
            />
          </label>

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {mode === 'add' ? 'Save Recipe' : 'Update Recipe'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<AppView>({ name: 'list' })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  const selectedRecipe =
    view.name === 'detail' || view.name === 'edit'
      ? recipes.find((recipe) => recipe.id === view.recipeId)
      : undefined

  const activeView =
    (view.name === 'detail' || view.name === 'edit') && !selectedRecipe
      ? ({ name: 'list' } as const)
      : view

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...recipes]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .filter((recipe) => {
        if (!query) {
          return true
        }

        const haystack = [
          recipe.name,
          recipe.description,
          ...recipe.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.amount]),
          ...recipe.steps,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
  }, [recipes, search])

  const handleSaveRecipe = (draft: RecipeDraft, existingId?: string) => {
    const nextRecipe = buildRecipeFromDraft(draft, existingId)

    setRecipes((current) => {
      if (existingId) {
        return current.map((recipe) =>
          recipe.id === existingId ? nextRecipe : recipe,
        )
      }

      return [nextRecipe, ...current]
    })

    setView({ name: 'detail', recipeId: nextRecipe.id })
  }

  const handleDeleteRecipe = (recipeId: string) => {
    const recipe = recipes.find((item) => item.id === recipeId)

    if (!recipe || !window.confirm(`Delete ${recipe.name}?`)) {
      return
    }

    setRecipes((current) => current.filter((item) => item.id !== recipeId))
    setView({ name: 'list' })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Deok-Sun’s Recipe Book</h1>
        <div className="app-header__emoji" aria-hidden="true">
          🐶🍲
        </div>
      </header>

      {activeView.name === 'list' && (
        <main className="screen">
          <div className="toolbar">
            <label className="search-field">
              <span className="visually-hidden">Search recipes</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Recipe"
              />
              <span className="search-field__icon" aria-hidden="true">
                ⌕
              </span>
            </label>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setView({ name: 'add' })}
            >
              Add Recipe
            </button>
          </div>

          <section className="recipe-list" aria-label="Recipe list">
            {filteredRecipes.length > 0 ? (
              filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  className="recipe-card"
                  onClick={() => setView({ name: 'detail', recipeId: recipe.id })}
                >
                  <div className="recipe-card__image-wrap">
                    <img src={recipe.image} alt={recipe.name} className="recipe-card__image" />
                  </div>
                  <div className="recipe-card__body">
                    <h2>{recipe.name}</h2>
                    <p>{recipe.description || 'Tap to view the full recipe.'}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon" aria-hidden="true">
                  🍽️
                </div>
                <h2>No recipes found</h2>
                <p>Try a different search or add a new recipe.</p>
              </div>
            )}
          </section>
        </main>
      )}

      {activeView.name === 'add' && (
        <RecipeFormView
          key="add-recipe"
          mode="add"
          onCancel={() => setView({ name: 'list' })}
          onSave={handleSaveRecipe}
        />
      )}

      {activeView.name === 'edit' && selectedRecipe && (
        <RecipeFormView
          key={selectedRecipe.id}
          mode="edit"
          initialRecipe={selectedRecipe}
          onCancel={() => setView({ name: 'detail', recipeId: selectedRecipe.id })}
          onSave={handleSaveRecipe}
        />
      )}

      {activeView.name === 'detail' && selectedRecipe && (
        <main className="screen screen--detail">
          <article className="panel panel--detail">
            <div className="detail-panel__header">
              <h2>{selectedRecipe.name}</h2>
              <button
                type="button"
                className="icon-button detail-panel__close"
                onClick={() => setView({ name: 'list' })}
                aria-label="Close recipe"
              >
                ×
              </button>
            </div>

            <div className="detail-panel__image-wrap">
              <img src={selectedRecipe.image} alt={selectedRecipe.name} className="detail-panel__image" />
            </div>

            {selectedRecipe.description && (
              <p className="detail-panel__description">{selectedRecipe.description}</p>
            )}

            <section className="detail-card">
              <h3>Ingredients</h3>
              {selectedRecipe.ingredients.length > 0 ? (
                <ul>
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      <span>{ingredient.name}</span>
                      <strong>{ingredient.amount}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No ingredients added yet.</p>
              )}
            </section>

            <section className="detail-card">
              <h3>Instructions</h3>
              {selectedRecipe.steps.length > 0 ? (
                <ol>
                  {selectedRecipe.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p>No instructions added yet.</p>
              )}
            </section>
          </article>

          <div className="detail-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setView({ name: 'edit', recipeId: selectedRecipe.id })}
            >
              Edit Recipe
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => handleDeleteRecipe(selectedRecipe.id)}
            >
              Delete Recipe
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
