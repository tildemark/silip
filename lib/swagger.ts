import { OpenAPIV3 } from 'openapi-types'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'SILIP API',
    version: '2.0.0',
    description: 'Searchable Interface for Legal Information & Privacy - API for Philippine Data Privacy Law with AI-powered semantic search',
    contact: {
      name: 'SILIP',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  tags: [
    {
      name: 'Search',
      description: 'Search legal documents and sections',
    },
    {
      name: 'Consultant',
      description: 'AI-powered legal consultant with source citations',
    },
    {
      name: 'Resources',
      description: 'Get statistics and document information',
    },
    {
      name: 'Sections',
      description: 'Retrieve specific sections',
    },
  ],
  paths: {
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search legal documents',
        description: 'Full-text search across legal documents with filtering options',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query string',
            schema: {
              type: 'string',
              example: 'consent',
            },
          },
          {
            name: 'filter',
            in: 'query',
            required: false,
            description: 'Document type or subtype filter',
            schema: {
              type: 'string',
              enum: ['ALL', 'DPA', 'IRR', 'ISSUANCE', 'CIRCULAR', 'ADVISORY', 'ORDER', 'DECISION', 'RESOLUTION'],
              default: 'ALL',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful search response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/SearchResult',
                      },
                    },
                    query: {
                      type: 'string',
                    },
                    filter: {
                      type: 'string',
                    },
                    total: {
                      type: 'number',
                    },
                    cached: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad request - invalid parameters',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/search/v2': {
      get: {
        tags: ['Search'],
        summary: 'Hybrid search with AI re-ranking (v2.0)',
        description:
          'Combines keyword and vector search with AI-powered re-ranking to prevent semantic drift. Supports filtering by document type.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query',
            schema: {
              type: 'string',
              example: 'data privacy requirements',
            },
          },
          {
            name: 'filter',
            in: 'query',
            description: 'Document type filter',
            schema: {
              type: 'string',
              enum: ['ALL', 'DPA', 'IRR', 'ISSUANCE', 'CIRCULAR', 'ADVISORY', 'ORDER', 'DECISION', 'RESOLUTION'],
              default: 'ALL',
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of results to return (max 100)',
            schema: {
              type: 'integer',
              default: 20,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Search results with re-ranking applied',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        allOf: [
                          {
                            $ref: '#/components/schemas/SearchResult',
                          },
                          {
                            type: 'object',
                            properties: {
                              score: {
                                type: 'number',
                                description: 'Re-ranking score (0-10) if re-ranked',
                              },
                            },
                          },
                        ],
                      },
                    },
                    count: {
                      type: 'number',
                    },
                    query: {
                      type: 'string',
                    },
                    filter: {
                      type: 'string',
                    },
                    reranked: {
                      type: 'boolean',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad request - missing or invalid parameters',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/consult': {
      post: {
        tags: ['Consultant'],
        summary: 'AI legal consultant with source citations',
        description:
          'Asks an AI legal consultant a question and receives a response with citations to relevant legal documents.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Legal question or inquiry',
                    example: 'What are the requirements for data breach notification?',
                  },
                },
                required: ['query'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Consultant response with cited sources',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    answer: {
                      type: 'string',
                      description: 'The consultant response',
                    },
                    sources: {
                      type: 'array',
                      items: {
                        allOf: [
                          {
                            $ref: '#/components/schemas/SearchResult',
                          },
                          {
                            type: 'object',
                            properties: {
                              citationNum: {
                                type: 'number',
                              },
                            },
                          },
                        ],
                      },
                    },
                    query: {
                      type: 'string',
                    },
                    confidence: {
                      type: 'string',
                      enum: ['low', 'medium', 'high'],
                    },
                    sourceCount: {
                      type: 'number',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad request - invalid query',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/resources': {
      get: {
        tags: ['Resources'],
        summary: 'Get database statistics',
        description: 'Retrieve statistics about documents, sections, and tags',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalDocuments: {
                      type: 'number',
                      description: 'Total number of legal documents',
                    },
                    totalSections: {
                      type: 'number',
                      description: 'Total number of sections',
                    },
                    totalTags: {
                      type: 'number',
                      description: 'Total number of tags',
                    },
                    documentsByType: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                          },
                          count: {
                            type: 'number',
                          },
                        },
                      },
                    },
                    issuancesBySubType: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          subType: {
                            type: 'string',
                          },
                          count: {
                            type: 'number',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/section/{id}': {
      get: {
        tags: ['Sections'],
        summary: 'Get section by ID',
        description: 'Retrieve detailed information about a specific section',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Section ID',
            schema: {
              type: 'string',
              example: 'cml6bmt1f000jpv255ilkq0my',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Section',
                },
              },
            },
          },
          '404': {
            description: 'Section not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      SearchResult: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Section ID',
          },
          documentId: {
            type: 'string',
            description: 'Parent document ID',
          },
          documentType: {
            type: 'string',
            enum: ['DPA', 'IRR', 'ISSUANCE'],
          },
          documentAlias: {
            type: 'string',
            description: 'Document short name/alias',
          },
          documentTitle: {
            type: 'string',
            description: 'Full document title',
          },
          sectionNum: {
            type: 'string',
            description: 'Section number',
          },
          sectionTitle: {
            type: 'string',
            description: 'Section title',
          },
          content: {
            type: 'string',
            description: 'Full section content',
          },
          highlightedContent: {
            type: 'string',
            description: 'Content with search terms highlighted using <mark> tags',
          },
          snippet: {
            type: 'string',
            description: 'Truncated excerpt around search terms',
          },
          tags: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Tag',
            },
          },
          url: {
            type: 'string',
            nullable: true,
            description: 'URL to source document',
          },
        },
      },
      Section: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          sectionNum: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          content: {
            type: 'string',
          },
          document: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              title: {
                type: 'string',
              },
              alias: {
                type: 'string',
              },
              type: {
                type: 'string',
              },
              url: {
                type: 'string',
                nullable: true,
              },
            },
          },
          tags: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Tag',
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Tag: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
            nullable: true,
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
        },
      },
    },
  },
}
