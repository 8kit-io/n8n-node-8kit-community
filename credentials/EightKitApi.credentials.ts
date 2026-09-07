// biome-ignore assist/source/organizeImports: organize imports
import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

export class EightKitApi implements ICredentialType {
  name = 'eightKitApi';
  displayName = '8kit API';
  documentationUrl = 'https://8kit.io/docs/intro';
  iconUrl = 'file:icons/8kit.light.svg';
  // The 8 mark on its own, in a square. The wordmark this replaced was 2.12:1 and
  // n8n renders credential icons in a square slot, so it squashed to an unreadable
  // smear. Light and dark have to be different files or n8n's own lint rejects it.
  icon: Icon = {
    light: 'file:icons/8kit.light.svg',
    dark: 'file:icons/8kit.dark.svg',
  };
  properties: INodeProperties[] = [
    {
      displayName: 'Host URL',
      name: 'hostUrl',
      type: 'string',
      default: '',
      placeholder: 'https://api.yourdomain.com',
      description: 'Base URL of your 8kit API instance',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      placeholder: 'st_XXXXXXXXXXXXXXXXXXXXX',
      description:
        'Your 8kit API key (starts with st_), generated on the API Keys page of the 8kit admin dashboard.',
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'X-Api-Key': '={{$credentials.apiKey}}',
        'Content-Type': 'application/json',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.hostUrl}}',
      url: '/api/v1/apps/health',
      method: 'GET',
    },
  };
}
