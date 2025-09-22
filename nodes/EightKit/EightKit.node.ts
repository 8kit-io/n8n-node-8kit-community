import {
  type IExecuteFunctions,
  type ILoadOptionsFunctions,
  type INodeExecutionData,
  type INodeListSearchItems,
  type INodeType,
  type INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';

import {
  executeAcquireLock,
  executeAddToLookup,
  executeAddToSet,
  executeCheckLock,
  executeCheckSetValues,
  executeCompleteLookupSet,
  executeCreateLastUpdated,
  executeCreateLookup,
  executeCreateSet,
  executeGetAppHealth,
  executeGetAppInfo,
  executeGetLastUpdated,
  executeGetLookupValues,
  executeGetSetInfo,
  executeGetSetValues,
  executeListLookups,
  executeListSets,
  executeReleaseLock,
  executeRemoveFromLookup,
  executeRemoveFromSet,
} from './operations';
import { EightKitHttpClient } from './utils/httpClient';

export class EightKit implements INodeType {
  description: INodeTypeDescription = {
    displayName: '8kit',
    name: 'eightKit',
    icon: 'file:8kit.svg',
    group: ['transform'],
    version: 2,
    description: 'Integrate with 8kit Automation Tools for set tracking and lookup mapping',
    defaults: {
      name: '8kit',
    },
    inputs: [NodeConnectionType.Main],
    outputs: `={{$parameter["resource"] === "setValues" && $parameter["operation"] === "checkSetValues" ? [{"type": "main", "displayName": "Yes"}, {"type": "main", "displayName": "No"}] : [{"type": "main"}]}}`,
    credentials: [
      {
        name: 'eightKitApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          // 1) Sets
          {
            name: 'Set',
            value: 'set',
            description: 'Manage sets themselves (create, list, get info)',
          },
          {
            name: 'Set Values',
            value: 'setValues',
            description: 'Manage values within sets (add, remove, check, get values)',
          },
          // 2) Lookups
          {
            name: 'Lookup',
            value: 'lookup',
            description: 'Manage lookups themselves (create, list, get info)',
          },
          {
            name: 'Lookup Values',
            value: 'lookupValues',
            description: 'Manage mappings within lookups (add, remove, get values)',
          },
          // 3) Locks
          {
            name: 'Lock',
            value: 'lock',
            description: 'Manage distributed locks for resource coordination',
          },
          // 4) Last Updated
          {
            name: 'Last Updated',
            value: 'lastUpdated',
            description: 'Track when operations or data sources were last updated',
          },
          // 5) App
          {
            name: 'App',
            value: 'app',
            description: 'Manage app information and health status',
          },
          // 6) Advanced
          {
            name: 'Advanced',
            value: 'advanced',
            description: 'Advanced composite operations combining multiple resources',
          },
        ],
        default: 'set',
      },

      /* =========================
       * 1) SETS
       * ========================= */

      // Set Operations (Create → List → Get Info)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['set'] } },
        options: [
          {
            name: 'Create',
            value: 'createSet',
            description: 'Create a new empty set for tracking unique values (emails, IDs, etc.)',
            action: 'Create a new set',
          },
          {
            name: 'List',
            value: 'listSets',
            description: 'Retrieve all sets available for your application',
            action: 'List all sets',
          },
          {
            name: 'Get Info',
            value: 'getSetInfo',
            description: 'Get detailed information about a specific set (metadata, statistics)',
            action: 'Get set information',
          },
        ],
        default: 'createSet',
      },

      // Name (for set operations)
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the set or lookup. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['set'] },
          hide: { operation: ['listSets'] },
        },
      },

      // Description (for create set)
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Optional human-readable description explaining the purpose of this record. Helpful for documentation and team collaboration.',
        displayOptions: {
          show: { resource: ['set'], operation: ['createSet'] },
        },
      },

      // Advanced Settings for Set (listSets)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: { show: { resource: ['set'], operation: ['listSets'] } },
        options: [
          {
            displayName: 'Pagination',
            name: 'pagination',
            type: 'fixedCollection',
            placeholder: 'Add Pagination',
            default: { pagination: {} },
            description: 'Configure pagination for large result sets',
            options: [
              {
                displayName: 'Pagination Settings',
                name: 'pagination',
                default: { pagination: {} },
                values: [
                  {
                    displayName: 'Page',
                    name: 'page',
                    type: 'number',
                    typeOptions: { minValue: 1, required: false },
                    default: null,
                    placeholder: '1',
                    description: 'Page number to retrieve (starts from 1).',
                  },
                  {
                    displayName: 'Items Per Page',
                    name: 'limit',
                    type: 'number',
                    typeOptions: { minValue: 1, maxValue: 100, required: false },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of sets to return per page (1-100).',
                  },
                  {
                    displayName: 'Offset (Advanced)',
                    name: 'offset',
                    type: 'number',
                    typeOptions: { minValue: 0, required: false },
                    default: null,
                    placeholder: '0',
                    description: 'Number of items to skip from the beginning.',
                  },
                ],
              },
            ],
          },
        ],
      },

      // Set Values Operations (Add → Check → Get → Remove)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['setValues'] } },
        options: [
          {
            name: 'Add Value',
            value: 'addToSet',
            description: 'Add a new value to a set - automatically handles duplicates',
            action: 'Add values to a set',
          },
          {
            name: 'Check Values',
            value: 'checkSetValues',
            description: 'Check if a value exists in a set - great for deduplication and filtering',
            action: 'Check if values exist in a set',
          },
          {
            name: 'Get Values',
            value: 'getSetValues',
            description: 'Retrieve all values stored in a set',
            action: 'Get all set values',
          },
          {
            name: 'Remove Value',
            value: 'removeFromSet',
            description: 'Remove a specific value from a set',
            action: 'Remove values from a set',
          },
        ],
        default: 'addToSet',
      },

      // Name (for setValues)
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the set or lookup. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: { show: { resource: ['setValues'] } },
      },

      // Value (for add/check/remove in setValues)
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The value to check, add, or remove from the set. Can be any string up to 255 characters (e.g., email, user ID, domain name).',
        required: true,
        displayOptions: {
          show: {
            resource: ['setValues'],
            operation: ['checkSetValues', 'addToSet', 'removeFromSet'],
          },
        },
      },

      // Include Set Value Data (for check)
      {
        displayName: 'Include Set Value Data',
        name: 'getSetValueData',
        type: 'boolean',
        default: false,
        description: 'Whether to include additional metadata about the set value in the output.',
        displayOptions: {
          show: { resource: ['setValues'], operation: ['checkSetValues'] },
        },
      },

      // Set Value Data Field Name (conditional)
      {
        displayName: 'Set Value Data Field Name',
        name: 'setValueDataFieldName',
        type: 'string',
        default: '__checkData',
        placeholder: '__checkData',
        description: 'The field name where set value metadata will be stored in the output JSON.',
        displayOptions: {
          show: {
            resource: ['setValues'],
            operation: ['checkSetValues'],
            getSetValueData: [true],
          },
        },
      },

      // Advanced Settings for Set Values (getSetValues)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: { show: { resource: ['setValues'], operation: ['getSetValues'] } },
        options: [
          {
            displayName: 'Pagination',
            name: 'pagination',
            type: 'fixedCollection',
            placeholder: 'Add Pagination',
            default: { pagination: {} },
            description: 'Configure pagination for large result sets',
            options: [
              {
                displayName: 'Pagination Settings',
                name: 'pagination',
                default: { pagination: {} },
                values: [
                  {
                    displayName: 'Page',
                    name: 'page',
                    type: 'number',
                    typeOptions: { minValue: 1, required: false },
                    default: null,
                    placeholder: '1',
                    description: 'Page number to retrieve (starts from 1).',
                  },
                  {
                    displayName: 'Items Per Page',
                    name: 'limit',
                    type: 'number',
                    typeOptions: { minValue: 1, maxValue: 100, required: false },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of set values to return per page (1-100).',
                  },
                  {
                    displayName: 'Offset (Advanced)',
                    name: 'offset',
                    type: 'number',
                    typeOptions: { minValue: 0, required: false },
                    default: null,
                    placeholder: '0',
                    description: 'Number of items to skip from the beginning.',
                  },
                ],
              },
            ],
          },
        ],
      },

      /* =========================
       * 2) LOOKUPS
       * ========================= */

      // Lookup Operations (Create → List)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lookup'] } },
        options: [
          {
            name: 'Create',
            value: 'createLookup',
            description: 'Create a new lookup table for mapping between different ID systems',
            action: 'Create a new lookup',
          },
          {
            name: 'List',
            value: 'listLookups',
            description: 'Retrieve all lookup tables available for your application',
            action: 'List all lookups',
          },
        ],
        default: 'createLookup',
      },

      // Name (for lookup)
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the set or lookup. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: { show: { resource: ['lookup'] }, hide: { operation: ['listLookups'] } },
      },

      // Description (for create lookup)
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        placeholder: '',
        description: 'Optional human-readable description explaining the purpose of this record.',
        displayOptions: { show: { resource: ['lookup'], operation: ['createLookup'] } },
      },

      // Advanced Settings for Lookup (listLookups)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: { show: { resource: ['lookup'], operation: ['listLookups'] } },
        options: [
          {
            displayName: 'Pagination',
            name: 'pagination',
            type: 'fixedCollection',
            placeholder: 'Add Pagination',
            default: { pagination: {} },
            description: 'Configure pagination for large result sets',
            options: [
              {
                displayName: 'Pagination Settings',
                name: 'pagination',
                default: { pagination: {} },
                values: [
                  {
                    displayName: 'Page',
                    name: 'page',
                    type: 'number',
                    typeOptions: { minValue: 1, required: false },
                    default: null,
                    placeholder: '1',
                    description: 'Page number to retrieve (starts from 1).',
                  },
                  {
                    displayName: 'Items Per Page',
                    name: 'limit',
                    type: 'number',
                    typeOptions: { minValue: 1, maxValue: 100, required: false },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of lookups to return per page (1-100).',
                  },
                  {
                    displayName: 'Offset (Advanced)',
                    name: 'offset',
                    type: 'number',
                    typeOptions: { minValue: 0, required: false },
                    default: null,
                    placeholder: '0',
                    description: 'Number of items to skip from the beginning.',
                  },
                ],
              },
            ],
          },
        ],
      },

      // Lookup Values Operations (Add → Get → Remove)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lookupValues'] } },
        options: [
          {
            name: 'Add Mapping',
            value: 'addToLookup',
            description: 'Create ID mappings between two systems (e.g., internal ID ↔ external ID)',
            action: 'Add ID mappings to a lookup',
          },
          {
            name: 'Get Values',
            value: 'getLookupValues',
            description: 'Retrieve all ID mappings stored in a lookup table',
            action: 'Get all lookup values',
          },
          {
            name: 'Remove Mapping',
            value: 'removeFromLookup',
            description: 'Remove a specific ID mapping from a lookup table',
            action: 'Remove values from a lookup',
          },
        ],
        default: 'addToLookup',
      },

      // Name (for lookupValues)
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the set or lookup. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: { show: { resource: ['lookupValues'] } },
      },

      // Left/Right Values (for addToLookup)
      {
        displayName: 'Left Value',
        name: 'leftValue',
        type: 'string',
        default: '',
        placeholder: '',
        description: 'The left-side value in the lookup mapping. Typically an ID from one system.',
        required: true,
        displayOptions: { show: { resource: ['lookupValues'], operation: ['addToLookup'] } },
      },
      {
        displayName: 'Right Value',
        name: 'rightValue',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The right-side value in the lookup mapping. Typically the corresponding ID from another system.',
        required: true,
        displayOptions: { show: { resource: ['lookupValues'], operation: ['addToLookup'] } },
      },

      // Value (for removeFromLookup)
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: 'value_to_remove',
        description:
          'The specific value to remove from the lookup. This should match an existing entry exactly.',
        required: true,
        displayOptions: {
          show: { resource: ['lookupValues'], operation: ['removeFromLookup'] },
        },
      },

      // Advanced Settings for Lookup Values (getLookupValues)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: {
          show: { resource: ['lookupValues'], operation: ['getLookupValues'] },
        },
        options: [
          {
            displayName: 'Pagination',
            name: 'pagination',
            type: 'fixedCollection',
            placeholder: 'Add Pagination',
            default: { pagination: {} },
            description: 'Configure pagination for large result sets',
            options: [
              {
                displayName: 'Pagination Settings',
                name: 'pagination',
                default: { pagination: {} },
                values: [
                  {
                    displayName: 'Page',
                    name: 'page',
                    type: 'number',
                    typeOptions: { minValue: 1, required: false },
                    default: null,
                    placeholder: '1',
                    description: 'Page number to retrieve (starts from 1).',
                  },
                  {
                    displayName: 'Items Per Page',
                    name: 'limit',
                    type: 'number',
                    typeOptions: { minValue: 1, maxValue: 100, required: false },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of lookup values to return per page (1-100).',
                  },
                  {
                    displayName: 'Offset (Advanced)',
                    name: 'offset',
                    type: 'number',
                    typeOptions: { minValue: 0, required: false },
                    default: null,
                    placeholder: '0',
                    description: 'Number of items to skip from the beginning.',
                  },
                ],
              },
            ],
          },
        ],
      },

      /* =========================
       * 3) LOCKS
       * ========================= */

      // Lock Operations (Acquire → Check → Release)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lock'] } },
        options: [
          {
            name: 'Acquire Lock',
            value: 'acquireLock',
            description: 'Attempt to acquire a lock for resource coordination',
            action: 'Acquire a lock',
          },
          {
            name: 'Check Lock',
            value: 'checkLock',
            description: 'Check if a specific lock exists and get its details',
            action: 'Check if a lock exists',
          },
          {
            name: 'Release Lock',
            value: 'releaseLock',
            description: 'Release a specific lock by key',
            action: 'Release a lock',
          },
        ],
        default: 'acquireLock',
      },

      // Key (for lock)
      {
        displayName: 'Key',
        name: 'key',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the lock. Must contain only letters, numbers, hyphens, and underscores. Maximum 255 characters.',
        required: true,
        displayOptions: { show: { resource: ['lock'] } },
      },

      // Timeout (for acquire lock)
      {
        displayName: 'Timeout (Seconds)',
        name: 'timeout',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 3600 },
        default: null,
        placeholder: '300',
        description:
          'Optional timeout in seconds. If not specified, the lock will not expire automatically.',
        displayOptions: { show: { resource: ['lock'], operation: ['acquireLock'] } },
      },

      /* =========================
       * 4) LAST UPDATED
       * ========================= */

      // Last Updated Operations (Create → Get)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lastUpdated'] } },
        options: [
          {
            name: 'Add New Last Updated',
            value: 'createLastUpdated',
            description: 'Create a new last updated record with current timestamp',
            action: 'Create last updated record',
          },
          {
            name: 'Get Last Updated',
            value: 'getLastUpdated',
            description: 'Retrieve a last updated record by key',
            action: 'Get last updated record',
          },
        ],
        default: 'createLastUpdated',
      },

      // Key (for lastUpdated)
      {
        displayName: 'Key',
        name: 'key',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the last updated record. Must contain only letters, numbers, hyphens, and underscores. Maximum 255 characters.',
        required: true,
        displayOptions: { show: { resource: ['lastUpdated'] } },
      },

      // Description (for create lastUpdated)
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        placeholder: '',
        description: 'Optional human-readable description explaining the purpose of this record.',
        displayOptions: {
          show: { resource: ['lastUpdated'], operation: ['createLastUpdated'] },
        },
      },

      // Date (for create lastUpdated)
      {
        displayName: 'Date',
        name: 'date',
        type: 'string',
        default: '',
        placeholder: 'YYYY-MM-DDTHH:mm:ss.sssZ',
        description:
          'Optional custom date in ISO 8601 format. If not specified, current timestamp will be used.',
        displayOptions: {
          show: { resource: ['lastUpdated'], operation: ['createLastUpdated'] },
        },
      },

      /* =========================
       * 5) APP
       * ========================= */

      // App Operations (Get Info → Health)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['app'] } },
        options: [
          {
            name: 'Get App Info',
            value: 'getAppInfo',
            description: 'Retrieve information about the authenticated app',
            action: 'Get app information',
          },
          {
            name: 'Health Check',
            value: 'getAppHealth',
            description: 'Check the health status of the authenticated app',
            action: 'Check app health',
          },
        ],
        default: 'getAppInfo',
      },

      /* =========================
       * 6) ADVANCED
       * ========================= */

      // Advanced Operations (Complete Lookup-Set)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['advanced'] } },
        options: [
          {
            name: 'Complete Lookup-Set',
            value: 'completeLookupSet',
            description:
              'Add mapping to lookup and value to set in one operation - perfect for ID tracking workflows',
            action: 'Complete lookup and set operation',
          },
        ],
        default: 'completeLookupSet',
      },

      // Lookup Name / Left / Right / Set Name / Value (for advanced completeLookupSet)
      {
        displayName: 'Lookup Name',
        name: 'lookupName',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Name of the lookup table for ID mapping. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupSet'] },
        },
      },
      {
        displayName: 'Left Value',
        name: 'leftValue',
        type: 'string',
        default: '',
        placeholder: 'internal_user_123',
        description:
          'The left-side value in the lookup mapping. Typically represents an ID or key from one system.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupSet'] },
        },
      },
      {
        displayName: 'Right Value',
        name: 'rightValue',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The right-side value in the lookup mapping. Typically represents the corresponding ID or key from another system.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupSet'] },
        },
      },
      {
        displayName: 'Set Name',
        name: 'setName',
        type: 'string',
        default: '',
        placeholder: 'processed-users',
        description:
          'Name of the set for tracking processed values. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupSet'] },
        },
      },
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The value to add to the set for tracking. Can be any string up to 255 characters (e.g., email, user ID, domain name).',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupSet'] },
        },
      },

      // Advanced Settings for Advanced (completeLookupSet)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure optional metadata and advanced options for the set value',
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupSet'] },
        },
        options: [
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'json',
            default: '{}',
            placeholder: '{}',
            description:
              'Optional JSON metadata to associate with the set value. Useful for tracking additional information about the value.',
          },
        ],
      },

      // Advanced Settings for Set Values (addToSet) — keep near end to avoid clutter
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure optional metadata and advanced options for the set value',
        displayOptions: { show: { resource: ['setValues'], operation: ['addToSet'] } },
        options: [
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'json',
            default: '{}',
            placeholder: '{}',
            description:
              'Optional JSON metadata to associate with this value. Useful for tracking additional information about the value.',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
    const items = this.getInputData();
    const _resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    // For checkSetValues, we need two output arrays
    if (operation === 'checkSetValues') {
      const existingData: INodeExecutionData[] = [];
      const nonExistingData: INodeExecutionData[] = [];

      for (let i = 0; i < items.length; i++) {
        const result = await executeCheckSetValues.call(this, i);

        if (result === null || result === undefined) {
          continue;
        }

        const newItem: INodeExecutionData = {
          json: result.result,
        };

        // Route to appropriate output based on existence
        if (result.outputIndex === 0) {
          existingData.push(newItem);
        } else {
          nonExistingData.push(newItem);
        }
      }

      return [existingData, nonExistingData];
    }

    // For other operations, use single output
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      let result: any;

      switch (operation) {
        case 'getAppInfo':
          result = await executeGetAppInfo.call(this, i);
          break;
        case 'getAppHealth':
          result = await executeGetAppHealth.call(this, i);
          break;
        case 'checkLock':
          result = await executeCheckLock.call(this, i);
          break;
        case 'acquireLock':
          result = await executeAcquireLock.call(this, i);
          break;
        case 'releaseLock':
          result = await executeReleaseLock.call(this, i);
          break;
        case 'getLastUpdated':
          result = await executeGetLastUpdated.call(this, i);
          break;
        case 'createLastUpdated':
          result = await executeCreateLastUpdated.call(this, i);
          break;
        case 'createSet':
          result = await executeCreateSet.call(this, i);
          break;
        case 'listSets':
          result = await executeListSets.call(this, i);
          break;
        case 'getSetInfo':
          result = await executeGetSetInfo.call(this, i);
          break;
        case 'addToSet':
          result = await executeAddToSet.call(this, i);
          break;
        case 'removeFromSet':
          result = await executeRemoveFromSet.call(this, i);
          break;
        case 'getSetValues':
          result = await executeGetSetValues.call(this, i);
          break;
        case 'createLookup':
          result = await executeCreateLookup.call(this, i);
          break;
        case 'listLookups':
          result = await executeListLookups.call(this, i);
          break;
        case 'addToLookup':
          result = await executeAddToLookup.call(this, i);
          break;
        case 'getLookupValues':
          result = await executeGetLookupValues.call(this, i);
          break;
        case 'removeFromLookup':
          result = await executeRemoveFromLookup.call(this, i);
          break;
        case 'completeLookupSet':
          result = await executeCompleteLookupSet.call(this, i);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Handle different result types
      if (result === null || result === undefined) {
        continue;
      }

      // Handle empty objects
      if (typeof result === 'object' && Object.keys(result).length === 0) {
        continue;
      }

      // Add valid results
      const newItem: INodeExecutionData = {
        json: result,
      };
      returnData.push(newItem);
    }

    return [returnData];
  }

  async getSets(this: ILoadOptionsFunctions): Promise<INodeListSearchItems[]> {
    try {
      const credentials = await this.getCredentials('eightKitApi');
      const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

      const client = new EightKitHttpClient(this as any, 0);
      const response = await client.get<any>(`${baseUrl}/api/v1/sets`);

      if (response?.success && response.data?.items) {
        return (response.data.items as Array<{ name: string }>).map((s) => ({
          name: s.name,
          value: s.name,
        }));
      }
    } catch (error) {
      console.log('Error loading sets:', error);
    }

    return [];
  }

  async getLookups(this: ILoadOptionsFunctions): Promise<INodeListSearchItems[]> {
    try {
      const credentials = await this.getCredentials('eightKitApi');
      const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

      const client = new EightKitHttpClient(this as any, 0);
      const response = await client.get<any>(`${baseUrl}/api/v1/lookups`);

      if (response?.success && response.data?.items) {
        return (response.data.items as Array<{ name: string }>).map((l) => ({
          name: l.name,
          value: l.name,
        }));
      }
    } catch (error) {
      console.log('Error loading lookups:', error);
    }

    return [];
  }
}
