declare module '@astrajs/collections' {
  export interface AstraClientOptions {
    astraDatabaseId: string;
    astraDatabaseRegion: string;
    applicationToken: string;
  }

  export interface FindOptions {
    limit?: number;
    pageSize?: number;
    pageState?: string;
  }

  export interface FindResult<T> {
    data: T[];
    pageState?: string;
  }

  export interface Collection<T = any> {
    namespace: string;
    collectionName: string;
    find(query: Record<string, any>, options?: FindOptions): Promise<FindResult<T>>;
    findOne(query: Record<string, any>): Promise<T | null>;
    create(documentId: string, document: T): Promise<T>;
    update(documentId: string, document: Partial<T>): Promise<T>;
    delete(documentId: string): Promise<boolean>;
  }

  export interface Namespace {
    namespace: string;
    collection<T = any>(collectionName: string): Promise<Collection<T>>;
  }

  export interface AstraClient {
    namespace(namespaceName: string): Namespace;
  }

  export function createClient(options: AstraClientOptions): Promise<AstraClient>;
}