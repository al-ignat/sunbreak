import type { SiteName } from '../types';
import type { ProviderGuidanceMode } from '../storage/types';

export interface ProviderGuidanceSource {
  readonly label: string;
  readonly url: string;
  readonly verifiedAt: string;
}

export interface ProviderGuidanceSection {
  readonly title: string;
  readonly content: string;
}

export interface ProviderRecoveryGuidance {
  readonly title: string;
  readonly steps: ReadonlyArray<string>;
  readonly caveat: string;
}

export interface ProviderGuidance {
  readonly tool: SiteName;
  readonly displayName: string;
  readonly accent: string;
  readonly lastVerified: string;
  readonly overview: ReadonlyArray<ProviderGuidanceSection>;
  readonly recovery: ProviderRecoveryGuidance;
  readonly sources: ReadonlyArray<ProviderGuidanceSource>;
  readonly modeNotes: Partial<Record<ProviderGuidanceMode, string>>;
}

export interface ResolvedProviderGuidance extends ProviderGuidance {
  readonly configuredMode: ProviderGuidanceMode;
  readonly modeNote: string | null;
}

const VERIFIED_AT = '2026-03-14';

export const PROVIDER_GUIDANCE: Record<SiteName, ProviderGuidance> = {
  chatgpt: {
    tool: 'chatgpt',
    displayName: 'ChatGPT',
    accent: '#10A37F',
    lastVerified: VERIFIED_AT,
    overview: [
      {
        title: 'Conversation controls',
        content: 'Chats can be deleted or archived from the sidebar or Data Controls. Deleted chats are removed from view immediately and OpenAI says they are scheduled for deletion within 30 days, subject to legal or security exceptions.',
      },
      {
        title: 'Training and privacy',
        content: 'Temporary Chat stays out of history and OpenAI says it is not used to train models. Consumer ChatGPT can also be excluded from training through Data Controls. Business, Enterprise, Edu, Teachers, and API data are not used for training by default.',
      },
      {
        title: 'Recovery framing',
        content: 'If a risky prompt was already sent, the fastest practical recovery step is usually to delete the conversation or the relevant chat as soon as possible and then rotate any exposed secret outside ChatGPT.',
      },
    ],
    recovery: {
      title: 'ChatGPT recovery path',
      steps: [
        'Open the ChatGPT conversation history sidebar.',
        'Use the three-dot menu on the relevant chat and choose Delete.',
        'If the conversation was archived, open Settings -> Data Controls -> Archived Chats to manage it there.',
      ],
      caveat: 'OpenAI says deleted chats are scheduled for deletion within 30 days, and Temporary Chats are deleted within 30 days. Business and enterprise retention can differ by workspace configuration.',
    },
    sources: [
      {
        label: 'How to Delete and Archive Chats in ChatGPT',
        url: 'https://help.openai.com/en/articles/8809935-how-to-delete-and-archive-chats-in-chatgpt/',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'Temporary Chat FAQ',
        url: 'https://help.openai.com/en/articles/8914046-temporary-chat-faq',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'Business data privacy, security, and compliance',
        url: 'https://openai.com/business-data/',
        verifiedAt: VERIFIED_AT,
      },
    ],
    modeNotes: {
      consumer: 'Configured as consumer ChatGPT guidance. Data Controls and Temporary Chat are the primary privacy levers.',
      business: 'Configured as ChatGPT Business guidance. OpenAI says business data is not used to train by default, and retention can follow workspace policy.',
      enterprise: 'Configured as ChatGPT Enterprise guidance. Retention and administrative controls can be organization-specific.',
      api: 'Configured as OpenAI API guidance. API data is not used to train by default, and retention can differ by contract or zero-retention agreement.',
    },
  },
  claude: {
    tool: 'claude',
    displayName: 'Claude',
    accent: '#D97706',
    lastVerified: VERIFIED_AT,
    overview: [
      {
        title: 'Conversation controls',
        content: 'Claude conversations can be renamed or deleted individually, and recent chats can also be deleted in bulk. Anthropic says deleted chats are removed from history immediately and deleted from back-end storage within 30 days.',
      },
      {
        title: 'Training and privacy',
        content: 'Anthropic says consumer Claude chats may be used to improve models only when the user allows it, when conversations are flagged for safety review, or when the user explicitly opts in. Commercial Claude and API data are not used to train models by default.',
      },
      {
        title: 'Recovery framing',
        content: 'If a risky Claude message was sent, the immediate recovery path is to delete the chat or conversation from history, then handle any exposed secret or regulated data outside Claude.',
      },
    ],
    recovery: {
      title: 'Claude recovery path',
      steps: [
        'Open the relevant conversation in Claude.',
        'Click the conversation title or overflow controls and choose Delete.',
        'For broader cleanup, use the chat history view and delete selected conversations in bulk.',
      ],
      caveat: 'Anthropic says deleted consumer and commercial chats are removed from history immediately and deleted from back-end systems within 30 days. Anthropic also says paid API customers do not have ad hoc deletion for API requests.',
    },
    sources: [
      {
        label: 'How can I delete or rename a conversation?',
        url: 'https://support.anthropic.com/en/articles/8230524-how-can-i-delete-or-rename-a-conversation',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'How long do you store my data?',
        url: 'https://privacy.anthropic.com/en/articles/10023548-how-long-do-you-store-my-data',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'Is my data used for model training? (consumer)',
        url: 'https://privacy.anthropic.com/en/articles/10023580-is-my-data-used-for-model-training',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'Is my data used for model training? (commercial)',
        url: 'https://privacy.anthropic.com/en/articles/7996868-is-my-data-used-for-model-training',
        verifiedAt: VERIFIED_AT,
      },
    ],
    modeNotes: {
      consumer: 'Configured as consumer Claude guidance. Consumer privacy controls and deletion behavior apply.',
      business: 'Configured as Claude Team/Business guidance. Anthropic says commercial data is not used to train by default.',
      enterprise: 'Configured as Claude enterprise guidance. Organization-level retention and controls may differ from consumer defaults.',
      api: 'Configured as Claude API guidance. Anthropic says commercial/API data is not used to train by default, and API deletion options are narrower.',
    },
  },
  gemini: {
    tool: 'gemini',
    displayName: 'Gemini',
    accent: '#4285F4',
    lastVerified: VERIFIED_AT,
    overview: [
      {
        title: 'Conversation controls',
        content: 'Gemini chats can be deleted from recent chats, which also removes the related Gemini Apps activity. Google says personal-account users can manage or delete Gemini Apps activity, while work or school users may have activity controls managed by their Workspace administrator.',
      },
      {
        title: 'Training and retention',
        content: 'Google says consumer Gemini Apps activity is kept by default with auto-delete options of 3, 18, or 36 months, and even with activity off, chats may still be retained for up to 72 hours. Google Workspace guidance says organization content is not human reviewed or used to train generative AI models outside the domain without permission.',
      },
      {
        title: 'Recovery framing',
        content: 'If a risky Gemini chat was sent, delete the relevant chat and review whether connected apps or Google services also received copied or shared data, because deleting the Gemini chat may not remove information already shared with those services.',
      },
    ],
    recovery: {
      title: 'Gemini recovery path',
      steps: [
        'Open recent chats in Gemini and delete the relevant conversation.',
        'For personal accounts, review Gemini Apps activity and delete any related activity items if needed.',
        'If the chat shared data with connected apps or Workspace services, review those services separately because deleting the Gemini chat may not delete data already shared there.',
      ],
      caveat: 'Google says deleting Gemini chats removes them from Gemini Apps activity, but data already shared with connected apps or other Google services may remain under those systems’ own policies. Work and school account controls can also be admin-managed.',
    },
    sources: [
      {
        label: 'Find and manage your recent chats in Gemini Apps',
        url: 'https://support.google.com/gemini/answer/13666746',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'Gemini Apps Privacy Hub',
        url: 'https://support.google.com/gemini/answer/13594961',
        verifiedAt: VERIFIED_AT,
      },
      {
        label: 'Generative AI in Google Workspace Privacy Hub',
        url: 'https://support.google.com/a/answer/15706919',
        verifiedAt: VERIFIED_AT,
      },
    ],
    modeNotes: {
      consumer: 'Configured as consumer Gemini guidance. Gemini Apps activity and personal Google-account controls apply.',
      workspace: 'Configured as Google Workspace guidance. Workspace administrators may manage activity, retention, and access controls.',
      enterprise: 'Configured as enterprise/work guidance. Retention and data controls can be admin-managed and may differ from personal Gemini defaults.',
    },
  },
};

export function getProviderGuidance(
  tool: string,
  mode: ProviderGuidanceMode = 'general',
): ResolvedProviderGuidance | null {
  if (tool === 'chatgpt' || tool === 'claude' || tool === 'gemini') {
    const guidance = PROVIDER_GUIDANCE[tool];
    return {
      ...guidance,
      configuredMode: mode,
      modeNote: guidance.modeNotes[mode] ?? null,
    };
  }
  return null;
}
