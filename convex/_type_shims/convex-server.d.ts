declare module "convex/server" {
  export type FunctionVisibility = "public" | "internal";

  export type GenericDataModel = any;

  export interface QueryStub {
    [Symbol.asyncIterator](): AsyncIterator<any>;
    withIndex(_indexName: string, _cb?: (q: any) => any): QueryStub;
    withSearchIndex(_indexName: string, _cb?: (q: any) => any): QueryStub;
    filter(_cb: (q: any) => any): QueryStub;
    order(_direction: any): QueryStub;
    take(_n: number): Promise<any[]>;
    first(): Promise<any | null>;
    unique(): Promise<any | null>;
    collect(): Promise<any[]>;
    paginate(_paginationOpts: any): Promise<any>;
  }

  export interface GenericDatabaseReader<_DataModel = any> {
    get(_id: any): Promise<any | null>;
    query(_tableName: string): QueryStub;
  }

  export interface GenericDatabaseWriter<_DataModel = any>
    extends GenericDatabaseReader<_DataModel> {
    insert(_tableName: string, _value: any): Promise<any>;
    patch(_id: any, _value: any): Promise<void>;
    delete(_id: any): Promise<void>;
  }

  export interface GenericQueryCtx<_DataModel = any> {
    db: GenericDatabaseReader<_DataModel>;
    runQuery: any;
    runMutation: any;
    runAction: any;
    auth: any;
    scheduler?: any;
    storage: any;
    vectorSearch?: any;
  }

  export interface GenericMutationCtx<_DataModel = any> {
    db: GenericDatabaseWriter<_DataModel>;
    runQuery: any;
    runMutation: any;
    runAction: any;
    auth: any;
    scheduler?: any;
    storage: any;
    vectorSearch?: any;
  }

  export interface GenericActionCtx<_DataModel = any> {
    db: GenericDatabaseWriter<_DataModel>;
    runQuery: any;
    runMutation: any;
    runAction: any;
    auth: any;
    scheduler?: any;
    storage: any;
    vectorSearch?: any;
  }

  export type QueryBuilder<
    DataModel extends GenericDataModel = any,
    _Visibility extends FunctionVisibility = any,
  > = (
    def:
      | {
          args?: any;
          returns?: any;
          handler: (ctx: GenericQueryCtx<DataModel>, args: any) => any;
        }
      | ((ctx: GenericQueryCtx<DataModel>, args: any) => any),
  ) => any;

  export type MutationBuilder<
    DataModel extends GenericDataModel = any,
    _Visibility extends FunctionVisibility = any,
  > = (
    def:
      | {
          args?: any;
          returns?: any;
          handler: (ctx: GenericMutationCtx<DataModel>, args: any) => any;
        }
      | ((ctx: GenericMutationCtx<DataModel>, args: any) => any),
  ) => any;

  export type ActionBuilder<
    DataModel extends GenericDataModel = any,
    _Visibility extends FunctionVisibility = any,
  > = (
    def:
      | {
          args?: any;
          returns?: any;
          handler: (ctx: GenericActionCtx<DataModel>, args: any) => any;
        }
      | ((ctx: GenericActionCtx<DataModel>, args: any) => any),
  ) => any;
  export type HttpActionBuilder = (
    handler: (ctx: GenericActionCtx<any>, request: Request) => any,
  ) => any;

  export const paginationOptsValidator: any;
  export const defineSchema: any;
  export const defineTable: any;
  export const httpRouter: any;
  export const cronJobs: any;
  export const defineApp: any;

  export const anyApi: any;
  export const componentsGeneric: any;

  export type RegisteredQuery<_Visibility = any, _Args = any, _Return = any> = any;
  export type RegisteredMutation<_Visibility = any, _Args = any, _Return = any> = any;
  export type RegisteredAction<_Visibility = any, _Args = any, _Return = any> = any;
  export type FunctionReference<_Type = any, _Visibility = any, _Args = any, _Return = any> =
    any;
  export type AnyFunctionReference = any;
}
