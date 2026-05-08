import { useMutation, useQueryClient } from '@tanstack/react-query'
import { defineExtensionMessaging } from '@webext-core/messaging'
import { ExtensionMessaging } from '@resumetailor/types'

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>()

export function useTailorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Delegate to background script — the only place permitted to orchestrate AI pipelines
      await sendMessage('START_TAILOR', undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor-context'] })
    }
  })
}
