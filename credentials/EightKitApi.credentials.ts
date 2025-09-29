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
  iconUrl = 'file:icons/8kit.svg';
  icon: Icon = {
    light: 'file:icons/8kit.svg',
    dark: 'file:icons/8kit.svg',
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
      displayName: 'Token Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: 'st_XXXXXXXXXXXXXXXXXXXXX',
      placeholder: 'st_XXXXXXXXXXXXXXXXXXXXX',
      description:
        'Your application Token Key (starts with st_), generated in the 8kit admin dashboard.',
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
