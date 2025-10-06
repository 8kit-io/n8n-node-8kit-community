import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeListSearchItems,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import {
  executeAcquireLock,
  executeAddToLookup,
  executeAddToUniq,
  executeCheckLock,
  executeCheckUniqs,
  executeCompleteLookupUniq,
  executeCreateLastUpdated,
  executeCreateLookup,
  executeCreateUniqCollection,
  executeDeleteLookup,
  executeDeleteUniqCollection,
  executeGetAppHealth,
  executeGetAppInfo,
  executeGetLastUpdated,
  executeGetLookupValues,
  executeGetUniqCollectionInfo,
  executeGetUniqs,
  executeListLookups,
  executeListUniqCollections,
  executeReleaseLock,
  executeRemoveFromLookup,
  executeRemoveFromUniqs,
  executeSearchLookupValues,
} from './operations';
import { EightKitHttpClient } from './utils/httpClient';

export class EightKit implements INodeType {
  description: INodeTypeDescription = {
    displayName: '8kit',
    name: 'eightKit',
    icon: 'file:8kit.svg',
    group: ['transform'],
    version: 2,
    description: 'Integrate with 8kit Automation Tools for Uniq collections and lookup mapping',
    defaults: {
      name: '8kit',
    },
    inputs: ['main'],
    outputs: `={{(
      ($parameter["resource"] === "uniqs" && $parameter["operation"] === "checkUniqs") ||
      ($parameter["resource"] === "lock" && $parameter["operation"] === "checkLock") ||
      ($parameter["resource"] === "lock" && $parameter["operation"] === "acquireLock")
    ) ? [{"type": "main", "displayName": "Yes"}, {"type": "main", "displayName": "No"}] : [{"type": "main"}]}}`,
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
          // 1) Uniq
          {
            name: 'Uniq',
            value: 'uniqs',
            description: 'Manage values within a Uniq collection (add, remove, check, get values)',
          },
          {
            name: 'Lookup',
            value: 'lookupValues',
            description: 'Manage mappings within a lookup (add, remove, get values)',
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
          // 2) Collections
          {
            name: 'Uniq Collection',
            value: 'uniqCollection',
            description: 'Manage Uniq collections themselves (create, list, get info)',
          },
          {
            name: 'Lookup Collection',
            value: 'lookup',
            description: 'Manage lookup collections themselves (create, list, get info)',
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
        default: 'uniqs',
      },

      /* =========================
       * 1) UNIQ COLLECTIONS
       * ========================= */

      // Uniq Collection Operations (Create → List → Get Info → Delete)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['uniqCollection'] } },
        options: [
          {
            name: 'Create',
            value: 'createUniqCollection',
            description:
              'Create a new empty Uniq collection for tracking unique values (emails, IDs, etc.)',
            action: 'Create a new Uniq collection',
          },
          {
            name: 'List',
            value: 'listUniqCollections',
            description: 'Retrieve all Uniq collections available for your application',
            action: 'List all Uniq collections',
          },
          {
            name: 'Get Info',
            value: 'getUniqCollectionInfo',
            description:
              'Get detailed information about a specific Uniq collection (metadata, statistics)',
            action: 'Get Uniq collection information',
          },
          // {
          //   name: "Delete",
          //   value: "deleteUniqCollection",
          //   description:
          //     "Delete a Uniq collection and all its values permanently",
          //   action: "Delete a Uniq collection",

          // },
        ],
        default: 'createUniqCollection',
      },

      // Name (for Uniq collection operations)
      {
        displayName: 'Collection Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the Uniq or lookup collection. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['uniqCollection'] },
          hide: { operation: ['listUniqCollections'] },
        },
      },

      // Confirm Delete (for delete Uniq collection)
      {
        displayName: 'Confirm Delete',
        name: 'confirmDelete',
        type: 'string',
        default: '',
        placeholder: 'Type "delete" to confirm',
        description:
          'Type "delete" (without quotes) to confirm the deletion. This action cannot be undone and will permanently delete the collection and all its values.',
        required: true,
        displayOptions: {
          show: {
            resource: ['uniqCollection'],
            operation: ['deleteUniqCollection'],
          },
        },
      },

      // Description (for create Uniq collection)
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Optional human-readable description explaining the purpose of this record. Helpful for documentation and team collaboration.',
        displayOptions: {
          show: {
            resource: ['uniqCollection'],
            operation: ['createUniqCollection'],
          },
        },
      },

      // Advanced Settings for Uniq Collection (listUniqCollections)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: {
          show: {
            resource: ['uniqCollection'],
            operation: ['listUniqCollections'],
          },
        },
        options: [
          {
            displayName: 'Pagination',
            name: 'pagination',
            type: 'fixedCollection',
            placeholder: 'Add Pagination',
            default: { pagination: {} },
            description: 'Configure pagination for large Uniq collection result sets',
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
                    typeOptions: {
                      minValue: 1,
                      maxValue: 100,
                      required: false,
                    },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of Uniq collections to return per page (1-100).',
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

      // Uniq Operations (Add → Check → Get → Remove)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['uniqs'] } },
        options: [
          {
            name: 'Add',
            value: 'addToUniq',
            description: 'Add a new value to a Uniq collection - automatically handles duplicates',
            action: 'Add values to a Uniq collection',
          },
          {
            name: 'Check Exists',
            value: 'checkUniqs',
            description:
              'Check if a value exists in a Uniq collection - great for deduplication and filtering',
            action: 'Check if values exist in a Uniq collection',
          },
          {
            name: 'Get',
            value: 'getUniqs',
            description: 'Retrieve all values stored in a Uniq collection',
            action: 'Get all Uniq values',
          },
          {
            name: 'Remove',
            value: 'removeFromUniq',
            description: 'Remove a specific value from a Uniq collection',
            action: 'Remove values from a Uniq collection',
          },
        ],
        default: 'addToUniq',
      },

      // Name (for uniqs)
      {
        displayName: 'Collection Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the Uniq or lookup collection. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: { show: { resource: ['uniqs'] } },
      },

      // Value (for add/check/remove in uniqs)
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The value to check, add, or remove from the Uniq collection. Can be any string up to 255 characters (e.g., email, user ID, domain name).',
        required: true,
        displayOptions: {
          show: {
            resource: ['uniqs'],
            operation: ['checkUniqs', 'addToUniq', 'removeFromUniq'],
          },
        },
      },

      // Include Uniq Data (for check)
      {
        displayName: 'Include Uniq Data',
        name: 'getUniqValueData',
        type: 'boolean',
        default: false,
        description: 'Whether to include additional metadata about the Uniq value in the output.',
        displayOptions: {
          show: { resource: ['uniqs'], operation: ['checkUniqs'] },
        },
      },

      // Uniq Data Field Name (conditional)
      {
        displayName: 'Uniq Data Field Name',
        name: 'uniqValueDataFieldName',
        type: 'string',
        default: '8kit',
        placeholder: '8kit',
        description: 'The field name where Uniq metadata will be stored in the output JSON.',
        displayOptions: {
          show: {
            resource: ['uniqs'],
            operation: ['checkUniqs'],
            getUniqValueData: [true],
          },
        },
      },

      // Advanced Settings for Set Values (getUniqs)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: {
          show: { resource: ['uniqs'], operation: ['getUniqs'] },
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
                    typeOptions: {
                      minValue: 1,
                      maxValue: 100,
                      required: false,
                    },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of Uniq values to return per page (1-100).',
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
       * 2) LOOKUP COLLECTIONS
       * ========================= */

      // Lookup Collection Operations (Create → List → Delete)
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
            description: 'Create a new lookup collection for mapping between different ID systems',
            action: 'Create a new lookup collection',
          },
          {
            name: 'List',
            value: 'listLookups',
            description: 'Retrieve all lookup collections available for your application',
            action: 'List all lookup collections',
          },
          // {
          //   name: "Delete",
          //   value: "deleteLookup",
          //   description:
          //     "Delete a lookup collection and all its values permanently",
          //   action: "Delete a lookup collection",
          // },
        ],
        default: 'createLookup',
      },

      // Name (for lookup collection)
      {
        displayName: 'Collection Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the Uniq or lookup collection. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['lookup'] },
          hide: { operation: ['listLookups'] },
        },
      },

      // Confirm Delete (for delete lookup collection)
      {
        displayName: 'Confirm Delete',
        name: 'confirmDelete',
        type: 'string',
        default: '',
        placeholder: 'Type "delete" to confirm',
        description:
          'Type "delete" (without quotes) to confirm the deletion. This action cannot be undone and will permanently delete the collection and all its values.',
        required: true,
        displayOptions: {
          show: { resource: ['lookup'], operation: ['deleteLookup'] },
        },
      },

      // Description (for create lookup collection)
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        placeholder: '',
        description: 'Optional human-readable description explaining the purpose of this record.',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Left System (for create lookup collection)
      {
        displayName: 'Left System',
        name: 'leftSystem',
        type: 'string',
        default: '',
        placeholder: 'system-a',
        description:
          'Optional identifier for the left-side system in the mapping (e.g., "Salesforce", "internal-db").',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Right System (for create lookup collection)
      {
        displayName: 'Right System',
        name: 'rightSystem',
        type: 'string',
        default: '',
        placeholder: 'system-b',
        description:
          'Optional identifier for the right-side system in the mapping (e.g., "HubSpot", "external-api").',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Allow Left Duplicates (for create lookup collection)
      {
        displayName: 'Allow Left Duplicates',
        name: 'allowLeftDups',
        type: 'boolean',
        default: true,
        description:
          'Whether to allow duplicate values on the left side. When false, each left value can only map to one right value.',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Allow Right Duplicates (for create lookup collection)
      {
        displayName: 'Allow Right Duplicates',
        name: 'allowRightDups',
        type: 'boolean',
        default: true,
        description:
          'Whether to allow duplicate values on the right side. When false, each right value can only map to one left value.',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Allow Left-Right Duplicates (for create lookup collection)
      {
        displayName: 'Allow Left-Right Duplicates',
        name: 'allowLeftRightDups',
        type: 'boolean',
        default: true,
        description:
          'Whether to allow the same left-right pair to exist multiple times in the lookup.',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Strict Checking (for create lookup collection)
      {
        displayName: 'Strict Checking',
        name: 'strictChecking',
        type: 'boolean',
        default: false,
        description:
          'Whether to enforce strict validation rules when adding mappings to this lookup collection.',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['createLookup'] },
        },
      },

      // Advanced Settings for Lookup Collection (listLookups)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure advanced options like pagination, filtering, and sorting',
        displayOptions: {
          show: { resource: ['lookup'], operation: ['listLookups'] },
        },
        options: [
          {
            displayName: 'Pagination',
            name: 'pagination',
            type: 'fixedCollection',
            placeholder: 'Add Pagination',
            default: { pagination: {} },
            description: 'Configure pagination for large lookup collection result sets',
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
                    typeOptions: {
                      minValue: 1,
                      maxValue: 100,
                      required: false,
                    },
                    default: null,
                    placeholder: '10',
                    description: 'Maximum number of lookup collections to return per page (1-100).',
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

      // Lookup Operations (Add → Get → Remove)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lookupValues'] } },
        options: [
          {
            name: 'Add',
            value: 'addToLookup',
            description: 'Create ID mappings between two systems (e.g., internal ID ↔ external ID)',
            action: 'Add ID mappings to a lookup',
          },
          {
            name: 'Search',
            value: 'searchLookupValues',
            description: 'Search for lookup values by left value, right value, or general search',
            action: 'Search lookup values',
          },
          {
            name: 'Get All',
            value: 'getLookupValues',
            description: 'Retrieve all ID mappings stored in a lookup',
            action: 'Get all lookup values',
          },
          {
            name: 'Remove',
            value: 'removeFromLookup',
            description: 'Remove a specific ID mapping from a lookup',
            action: 'Remove values from a lookup',
          },
        ],
        default: 'addToLookup',
      },

      // Name (for lookupValues)
      {
        displayName: 'Collection Name',
        name: 'name',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Unique identifier for the Uniq or lookup collection. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
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
        displayOptions: {
          show: { resource: ['lookupValues'], operation: ['addToLookup'] },
        },
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
        displayOptions: {
          show: { resource: ['lookupValues'], operation: ['addToLookup'] },
        },
      },

      // Search Type (for searchLookupValues)
      {
        displayName: 'Search Type',
        name: 'searchType',
        type: 'options',
        default: 'search',
        options: [
          {
            name: 'General Search',
            value: 'search',
            description: 'Search both left and right values using partial matching (contains)',
          },
          {
            name: 'Left Value (Exact)',
            value: 'left',
            description: 'Search by exact left value match',
          },
          {
            name: 'Right Value (Exact)',
            value: 'right',
            description: 'Search by exact right value match',
          },
        ],
        description:
          'Type of search to perform. "General Search" uses partial matching, while "Left/Right Value" require exact matches.',
        required: true,
        displayOptions: {
          show: {
            resource: ['lookupValues'],
            operation: ['searchLookupValues'],
          },
        },
      },

      // Search Value (for searchLookupValues)
      {
        displayName: 'Value',
        name: 'searchValue',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The value to search for. For "General Search" this will match partial text in both left and right values. For "Left/Right Value" this must match exactly.',
        required: true,
        displayOptions: {
          show: {
            resource: ['lookupValues'],
            operation: ['searchLookupValues'],
          },
        },
      },

      // Value (for removeFromLookup)
      {
        displayName: 'Lookup ID',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The specific lookup ID to remove from the lookup. This should match an existing entry exactly.',
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
                    typeOptions: {
                      minValue: 1,
                      maxValue: 100,
                      required: false,
                    },
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
            name: 'Acquire',
            value: 'acquireLock',
            description: 'Attempt to acquire a lock for resource coordination',
            action: 'Acquire a lock',
          },
          {
            name: 'Check',
            value: 'checkLock',
            description: 'Check if a specific lock exists and get its details',
            action: 'Check if a lock exists',
          },
          {
            name: 'Release',
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

      // Calling Function (for acquire lock)
      {
        displayName: 'Calling Function',
        name: 'callingFn',
        type: 'string',
        default: 'n8n-workflow',
        placeholder: 'my-workflow-name',
        description:
          'Identifier for the calling function or workflow. Used to track which process acquired the lock.',
        required: true,
        displayOptions: {
          show: { resource: ['lock'], operation: ['acquireLock'] },
        },
      },

      // Timeout (for acquire lock)
      {
        displayName: 'Timeout (Seconds)',
        name: 'timeout',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 3600 },
        default: 600,
        placeholder: 'No expiration',
        description:
          'Optional timeout in seconds. If not specified, the lock will not expire automatically.',
        displayOptions: {
          show: { resource: ['lock'], operation: ['acquireLock'] },
        },
      },

      // Include Lock Data (for all lock operations)
      {
        displayName: 'Include Lock Data',
        name: 'getLockData',
        type: 'boolean',
        default: false,
        description: 'Whether to include lock details in the output.',
        displayOptions: {
          show: { resource: ['lock'] },
        },
      },

      // Lock Data Field Name (conditional on Include Lock Data)
      {
        displayName: 'Lock Data Field Name',
        name: 'lockDataFieldName',
        type: 'string',
        default: '8kit',
        placeholder: '8kit',
        description: 'The field name where lock data will be stored in the output JSON.',
        displayOptions: {
          show: {
            resource: ['lock'],
            getLockData: [true],
          },
        },
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
            name: 'Add',
            value: 'createLastUpdated',
            description: 'Create a new last updated record with current timestamp',
            action: 'Create last updated record',
          },
          {
            name: 'Get',
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

      // Date (string input for create lastUpdated)
      {
        displayName: 'Date',
        name: 'dateString',
        type: 'string',
        default: undefined,
        placeholder: '',
        description: 'The date in the format specified below. Leave empty to use current time.',
        displayOptions: {
          show: {
            resource: ['lastUpdated'],
            operation: ['createLastUpdated'],
          },
        },
      },

      // Input Format (for create lastUpdated)
      {
        displayName: 'Date Format',
        name: 'inputFormat',
        type: 'options',
        default: 'iso8601-tz',
        required: false,
        placeholder: 'Select a format',
        options: [
          {
            name: 'ISO 8601 with Timezone',
            description: 'Example: 2025-10-08T09:44:21.982+01:00',
            value: 'iso8601-tz',
          },
          {
            name: 'ISO 8601 UTC',
            description: 'Example: 2024-01-01T00:00:00Z',
            value: 'iso8601-utc',
          },
          {
            name: 'dd-MM-yyyy',
            description: 'Example: 08-10-2025',
            value: 'dd-MM-yyyy',
          },
          {
            name: 'MM-dd-yyyy',
            description: 'Example: 10-08-2025',
            value: 'MM-dd-yyyy',
          },
          {
            name: 'yyyy-MM-dd',
            description: 'Example: 2025-10-08',
            value: 'yyyy-MM-dd',
          },
          {
            name: 'dd/MM/yyyy',
            description: 'Example: 08/10/2025',
            value: 'dd/MM/yyyy',
          },
          {
            name: 'MM/dd/yyyy',
            description: 'Example: 10/08/2025',
            value: 'MM/dd/yyyy',
          },
          {
            name: 'yyyy/MM/dd',
            description: 'Example: 2025/10/08',
            value: 'yyyy/MM/dd',
          },
          {
            name: 'Unix Timestamp - Milliseconds',
            description: 'Example: 1728378261982',
            value: 'unix-ms',
          },
          {
            name: 'Unix Timestamp - Seconds',
            description: 'Example: 1728378261',
            value: 'unix-s',
          },
          {
            name: 'Custom Format',
            description: 'Define your own format using tokens like yyyy, MM, dd, HH, mm, ss',
            value: 'custom',
          },
        ],
        description: 'The format of the input date string',
        displayOptions: {
          show: {
            resource: ['lastUpdated'],
            operation: ['createLastUpdated'],
          },
        },
      },
      {
        displayName: 'Custom Format',
        name: 'inputCustomFormat',
        type: 'string',
        default: 'yyyy-MM-dd HH:mm:ss',
        placeholder: 'yyyy-MM-dd HH:mm:ss',
        hint: 'List of special tokens <a target="_blank" href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">More info</a>',
        description:
          "Provide the expected format using tokens like yyyy, MM, dd, HH, mm, ss. Example: yyyy-MM-dd'T'HH:mm:ss",
        displayOptions: {
          show: {
            resource: ['lastUpdated'],
            operation: ['createLastUpdated'],
            inputFormat: ['custom'],
          },
        },
      },

      // Date Format (for get lastUpdated)
      {
        displayName: 'Date Format',
        name: 'outputFormat',
        type: 'options',
        default: 'iso8601-tz',
        required: false,
        placeholder: 'Select a format',
        hint: "The default timezone is n8n's timezone",
        options: [
          {
            name: 'ISO 8601 with Timezone',
            description: 'Example: 2025-10-08T09:44:21.982+01:00',
            value: 'iso8601-tz',
          },
          {
            name: 'ISO 8601 UTC',
            description: 'Example: 2024-01-01T00:00:00Z',
            value: 'iso8601-utc',
          },
          {
            name: 'dd-MM-yyyy',
            description: 'Example: 08-10-2025',
            value: 'dd-MM-yyyy',
          },
          {
            name: 'MM-dd-yyyy',
            description: 'Example: 10-08-2025',
            value: 'MM-dd-yyyy',
          },
          {
            name: 'yyyy-MM-dd',
            description: 'Example: 2025-10-08',
            value: 'yyyy-MM-dd',
          },
          {
            name: 'dd/MM/yyyy',
            description: 'Example: 08/10/2025',
            value: 'dd/MM/yyyy',
          },
          {
            name: 'MM/dd/yyyy',
            description: 'Example: 10/08/2025',
            value: 'MM/dd/yyyy',
          },
          {
            name: 'yyyy/MM/dd',
            description: 'Example: 2025/10/08',
            value: 'yyyy/MM/dd',
          },
          {
            name: 'Unix Timestamp - Milliseconds',
            description: 'Example: 1728378261982',
            value: 'unix-ms',
          },
          {
            name: 'Unix Timestamp - Seconds',
            description: 'Example: 1728378261',
            value: 'unix-s',
          },
          {
            name: 'Custom Format',
            description: 'Define your own format using tokens like yyyy, MM, dd, HH, mm, ss',
            value: 'custom',
          },
        ],
        description: 'The format to use for the date',
        displayOptions: {
          show: {
            resource: ['lastUpdated'],
            operation: ['getLastUpdated'],
          },
        },
      },

      {
        displayName: 'Custom Format',
        name: 'outputCustomFormat',
        type: 'string',

        default: 'yyyy-MM-dd HH:mm:ss',
        placeholder: 'yyyy-MM-dd HH:mm:ss',
        hint: 'List of special tokens <a target="_blank" href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">More info</a>',
        description:
          "Provide the date format using tokens like yyyy, MM, dd, HH, mm, ss. Example: yyyy-MM-dd'T'HH:mm:ss",
        displayOptions: {
          show: {
            resource: ['lastUpdated'],
            operation: ['getLastUpdated'],
            outputFormat: ['custom'],
          },
        },
      },
      // Use UTC Timezone (for get lastUpdated)
      {
        displayName: 'Use UTC Timezone',
        name: 'useUtcTimezone',
        type: 'boolean',
        default: false,
        description:
          "Whether to convert the date to UTC timezone (+00:00) instead of using n8n's server timezone",
        displayOptions: {
          show: {
            resource: ['lastUpdated'],
            operation: ['getLastUpdated'],
          },
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
            name: 'Complete Lookup-Uniq',
            value: 'completeLookupUniq',
            description:
              'Add mapping to a lookup and value to a Uniq collection in one operation - perfect for ID tracking workflows',
            action: 'Complete lookup and Uniq operation',
          },
        ],
        default: 'completeLookupUniq',
      },

      // Lookup Name / Left / Right / Uniq Name / Value (for advanced completeLookupUniq)
      {
        displayName: 'Lookup Collection Name',
        name: 'lookupName',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Name of the lookup table for ID mapping. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupUniq'] },
        },
      },
      {
        displayName: 'Left Value',
        name: 'leftValue',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The left-side value in the lookup mapping. Typically represents an ID or key from one system.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupUniq'] },
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
          show: { resource: ['advanced'], operation: ['completeLookupUniq'] },
        },
      },
      {
        displayName: 'Uniq Collection Name',
        name: 'uniqName',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'Name of the Uniq collection for tracking processed values. Must contain only letters, numbers, hyphens, and underscores. Maximum 100 characters.',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupUniq'] },
        },
      },
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: '',
        description:
          'The value to add to the Uniq collection for tracking. Can be any string up to 255 characters (e.g., email, user ID, domain name).',
        required: true,
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupUniq'] },
        },
      },

      // Advanced Settings for Advanced (completeLookupUniq)
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure optional metadata and advanced options for the Uniq value',
        displayOptions: {
          show: { resource: ['advanced'], operation: ['completeLookupUniq'] },
        },
        options: [
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'json',
            default: '{}',
            placeholder: '{}',
            description:
              'Optional JSON metadata to associate with the Uniq value. Useful for tracking additional information about the value.',
          },
        ],
      },

      // Advanced Settings for Uniq (addToUniq) — keep near end to avoid clutter
      {
        displayName: 'Advanced Settings',
        name: 'advancedSettings',
        type: 'collection',
        placeholder: 'Add Advanced Settings',
        default: {},
        description: 'Configure optional metadata and advanced options for the Uniq value',
        displayOptions: {
          show: { resource: ['uniqs'], operation: ['addToUniq'] },
        },
        options: [
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'json',
            default: '{}',
            placeholder: '{}',
            description:
              'Optional JSON metadata to associate with this Uniq value. Useful for tracking additional information about the value.',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
    const items = this.getInputData();
    const _resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    // For operations with dual outputs (yes/no branches)
    if (operation === 'checkUniqs' || operation === 'checkLock' || operation === 'acquireLock') {
      const yesData: INodeExecutionData[] = [];
      const noData: INodeExecutionData[] = [];

      for (let i = 0; i < items.length; i++) {
        let result: any;

        if (operation === 'checkUniqs') {
          result = await executeCheckUniqs.call(this, i);
        } else if (operation === 'checkLock') {
          result = await executeCheckLock.call(this, i);
        } else if (operation === 'acquireLock') {
          result = await executeAcquireLock.call(this, i);
        }

        if (result === null || result === undefined) {
          continue;
        }

        const inputItem = items[i];
        const newItem: INodeExecutionData = {
          json: result.result,
          pairedItem: { item: i },
        };

        if (inputItem.binary) {
          newItem.binary = inputItem.binary;
        }

        // Route to appropriate output based on outputIndex
        if (result.outputIndex === 0) {
          yesData.push(newItem);
        } else {
          noData.push(newItem);
        }
      }

      return [yesData, noData];
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
        case 'createUniqCollection':
          result = await executeCreateUniqCollection.call(this, i);
          break;
        case 'deleteUniqCollection':
          result = await executeDeleteUniqCollection.call(this, i);
          break;
        case 'listUniqCollections':
          result = await executeListUniqCollections.call(this, i);
          break;
        case 'getUniqCollectionInfo':
          result = await executeGetUniqCollectionInfo.call(this, i);
          break;
        case 'addToUniq':
          result = await executeAddToUniq.call(this, i);
          break;
        case 'removeFromUniq':
          result = await executeRemoveFromUniqs.call(this, i);
          break;
        case 'getUniqs':
          result = await executeGetUniqs.call(this, i);
          break;
        case 'createLookup':
          result = await executeCreateLookup.call(this, i);
          break;
        case 'deleteLookup':
          result = await executeDeleteLookup.call(this, i);
          break;
        case 'listLookups':
          result = await executeListLookups.call(this, i);
          break;
        case 'addToLookup':
          result = await executeAddToLookup.call(this, i);
          break;
        case 'searchLookupValues':
          result = await executeSearchLookupValues.call(this, i);
          break;
        case 'getLookupValues':
          result = await executeGetLookupValues.call(this, i);
          break;
        case 'removeFromLookup':
          result = await executeRemoveFromLookup.call(this, i);
          break;
        case 'completeLookupUniq':
          result = await executeCompleteLookupUniq.call(this, i);
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
        json: {
          ...result,
        },
        pairedItem: { item: i },
      };
      returnData.push(newItem);
    }

    return [returnData];
  }

  async getUniqs(this: ILoadOptionsFunctions): Promise<INodeListSearchItems[]> {
    try {
      const credentials = await this.getCredentials('eightKitApi');
      const baseUrl = (credentials.hostUrl as string).trim().replace(/\/$/, '');

      const client = new EightKitHttpClient(this as any, 0);
      const response = await client.get<any>(`${baseUrl}/api/v1/uniqs`);

      if (response?.success && response.data?.items) {
        return (response.data.items as Array<{ name: string }>).map((s) => ({
          name: s.name,
          value: s.name,
        }));
      }
    } catch (error) {
      console.log('Error loading Uniq collections:', error);
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
      console.log('Error loading lookup collections:', error);
    }

    return [];
  }
}
