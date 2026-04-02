import { useState } from "react";
import { RecipeDetail } from "../components/RecipeDetail";
import { ConfirmModal } from "../components/ConfirmModal";
import type { RecipeDetail as RecipeDetailType, UserRole } from "@recipe-mgmt/shared";

interface RecipeDetailPageProps {
  recipe: RecipeDetailType | undefined;
  loading: boolean;
  error: string | null;
  role: UserRole;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function RecipeDetailPage({
  recipe,
  loading,
  error,
  role,
  onBack,
  onEdit,
  onDelete,
}: RecipeDetailPageProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (loading) {
    return <div className="loading">Loading recipe...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Failed to load recipe: {error}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to recipes
        </button>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <>
      <RecipeDetail
        recipe={recipe}
        role={role}
        onBack={onBack}
        onEdit={onEdit}
        onDelete={() => setShowDeleteModal(true)}
      />

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Recipe?"
          description={`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            setShowDeleteModal(false);
            onDelete();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
