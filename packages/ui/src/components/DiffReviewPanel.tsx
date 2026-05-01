import { DiffCard, DiffCardProps } from './DiffCard'

export interface ChangeItem extends Omit<DiffCardProps, 'onAccept' | 'onReject' | 'onRequestAlternative'> {}

export type ReviewDecisionType = 'accepted' | 'rejected' | 'alternative_requested'

export interface DiffReviewPanelProps {
  changes: ChangeItem[]
  decisions: Record<string, ReviewDecisionType>
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRequestAlternative: (id: string) => void
  onSubmit: () => void
  isSubmitting?: boolean
}

export function DiffReviewPanel({
  changes,
  decisions,
  onAccept,
  onReject,
  onRequestAlternative,
  onSubmit,
  isSubmitting = false
}: DiffReviewPanelProps) {
  const totalChanges = changes.length
  const reviewedCount = Object.keys(decisions).length
  const isComplete = reviewedCount === totalChanges && totalChanges > 0
  const progressPercent = totalChanges === 0 ? 0 : Math.round((reviewedCount / totalChanges) * 100)

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Header & Progress */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur pb-4 pt-2 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Review AI Changes</h2>
          <span className="text-sm font-medium text-gray-500">
            {reviewedCount} of {totalChanges} reviewed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-black h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Changes List */}
      <div className="flex flex-col gap-2">
        {changes.map(change => {
          const decision = decisions[change.changeId]
          const isReviewed = decision !== undefined

          return (
            <div 
              key={change.changeId} 
              className={`transition-opacity duration-300 ${isReviewed ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
            >
              {isReviewed && (
                <div className="text-xs font-bold uppercase tracking-wider mb-1 flex justify-end">
                  {decision === 'accepted' && <span className="text-green-600">✓ Accepted</span>}
                  {decision === 'rejected' && <span className="text-gray-500">✕ Rejected</span>}
                  {decision === 'alternative_requested' && <span className="text-blue-600">↻ Alternative Requested</span>}
                </div>
              )}
              <DiffCard
                {...change}
                onAccept={onAccept}
                onReject={onReject}
                onRequestAlternative={onRequestAlternative}
              />
            </div>
          )
        })}
        {totalChanges === 0 && (
          <div className="text-center py-12 text-gray-500 border rounded-lg border-dashed">
            No changes were made by the AI. Your resume is already highly optimized.
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end pt-4 border-t mt-4 pb-8">
        <button
          onClick={onSubmit}
          disabled={!isComplete || isSubmitting}
          className={`px-6 py-2.5 rounded-md font-semibold shadow-sm transition-all ${
            isComplete && !isSubmitting
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Saving Decisions...' : 'Finalize Resume'}
        </button>
      </div>
    </div>
  )
}
