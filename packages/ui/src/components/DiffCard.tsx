
export interface DiffCardProps {
  changeId: string
  section: string
  original: string
  changedTo: string
  reason: string
  impact: 'high' | 'medium' | 'low'
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRequestAlternative: (id: string) => void
}

export function DiffCard({
  changeId,
  section,
  original,
  changedTo,
  reason,
  impact,
  onAccept,
  onReject,
  onRequestAlternative
}: DiffCardProps) {
  // Exact color tokens from GEMINI.md
  // Added: green-500 / bg-green-50
  // Removed: red-500 / bg-red-50
  // Unchanged: gray-700 / bg-gray-50
  
  const impactColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="border rounded-md shadow-sm p-4 mb-4 bg-white flex flex-col gap-3">
      <div className="flex justify-between items-center border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm uppercase tracking-wider text-gray-700">{section}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${impactColors[impact]}`}>
            {impact.toUpperCase()} IMPACT
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded italic border border-gray-100">
        Reason: {reason}
      </p>

      <div className="flex flex-col gap-2 text-sm font-mono overflow-x-auto">
        {original && (
          <div className="p-3 bg-red-50 text-red-500 rounded border border-red-100 whitespace-pre-wrap leading-relaxed">
            <span className="select-none mr-2 opacity-70 font-bold">-</span>
            {original}
          </div>
        )}
        {changedTo && (
          <div className="p-3 bg-green-50 text-green-500 rounded border border-green-100 whitespace-pre-wrap leading-relaxed">
            <span className="select-none mr-2 opacity-70 font-bold">+</span>
            {changedTo}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-2 pt-2 border-t justify-end">
        <button 
          onClick={() => onReject(changeId)}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
        >
          Reject
        </button>
        <button 
          onClick={() => onRequestAlternative(changeId)}
          className="px-4 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded text-sm font-medium transition-colors"
        >
          Alternative
        </button>
        <button 
          onClick={() => onAccept(changeId)}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
