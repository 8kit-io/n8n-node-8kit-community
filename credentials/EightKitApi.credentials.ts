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
  documentationUrl = 'https://8kit.io/docs/intro/index.html';
  iconUrl = 'file:8kit.svg';
  icon?: Icon | undefined = {
    light: 'file:8kit.svg',
    dark: 'file:8kit.svg',
  };
  properties: INodeProperties[] = [
    {
      displayName: 'Host URL',
      name: 'hostUrl',
      type: 'string',
      default: 'https://api.yourdomain.com',
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
      placeholder: 'st_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      description: 'Your application API key (starts with st_)',
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
