export const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined && 
         typeof window.PublicKeyCredential === 'function';
};

export const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const bufferToBase64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64urlToBuffer = (base64url: string): ArrayBuffer => {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
};

export const registerBiometrics = async (userEmail: string) => {
  if (!isWebAuthnSupported()) throw new Error('Biometria não suportada neste dispositivo.');

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: "FinDash", id: window.location.hostname },
    user: {
      id: userId,
      name: userEmail,
      displayName: userEmail
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    },
    timeout: 60000,
    attestation: "none"
  };

  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
  if (!credential) throw new Error('Falha ao registrar biometria.');

  const credentialId = bufferToBase64url(credential.rawId);
  localStorage.setItem('biometric_credential_id', credentialId);
  localStorage.setItem('biometrics_enabled', 'true');
  
  return true;
};

export const verifyBiometrics = async () => {
  const credentialIdStr = localStorage.getItem('biometric_credential_id');
  if (!credentialIdStr) throw new Error('Biometria não configurada.');

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [{
      type: "public-key",
      id: base64urlToBuffer(credentialIdStr)
    }],
    userVerification: "required",
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({ publicKey });
  if (!assertion) throw new Error('Falha na verificação biométrica.');
  
  return true;
};

export const disableBiometrics = () => {
  localStorage.removeItem('biometric_credential_id');
  localStorage.setItem('biometrics_enabled', 'false');
};

export const isBiometricsEnabled = () => {
  return localStorage.getItem('biometrics_enabled') === 'true';
};
