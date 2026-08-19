interface KingBotUIApi {
  toast(message: string, type?: 'info' | 'error' | 'success', duration?: number): void;
  openModal(modal: HTMLElement | null): void;
  closeModal(modal: HTMLElement | null): void;
  setButtonLoading(button: HTMLButtonElement | null, isLoading: boolean, loadingLabel?: string): void;
}

interface KingBotUserShape {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  verified: boolean;
  plan: string;
  planLabel: string;
  isVip: boolean;
  demoBalance: number;
  mode: string;
  isAdmin: boolean;
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
  renderButton(
    target: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      shape?: string;
      width?: number;
      text?: string;
      logo_alignment?: string;
    }
  ): void;
}

interface Window {
  KingBotUI?: KingBotUIApi;
  KingBotUser?: KingBotUserShape;
  kingbotLogout?: () => void;
  __kbResizeTimer?: number;
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
}
