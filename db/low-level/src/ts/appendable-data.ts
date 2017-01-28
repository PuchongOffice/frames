
import { UnexpectedResponseContent, SafeError } from "./util";
import { ApiClient, ApiClientConfig } from "./client";
import { saneResponse } from "./util";
import { DataIDHandle } from "./data-id";
import * as WebRequest from "web-request";

import * as crypto from "crypto";


export type FilterType = "BlackList" | "WhiteList";

export type AppendableDataId = number;

export interface AppendableDataMetadataBase {
    isOwner: boolean;
    version: number;
    filterType: FilterType;
    dataLength: number;
    deletedDataLength: number;
}
function isAppendableDataMetadataBase(x: any): x is AppendableDataMetadataBase {
    return !(  typeof x.isOwner === "undefined"
            || typeof x.version === "undefined"
            || typeof x.filterType === "undefined"
            || typeof x.dataLength === "undefined"
            || typeof x.deletedDataLength === "undefined");
}

export interface FromDataIDHandleResponse extends AppendableDataMetadataBase {
    handleId: AppendableDataId;
}
function isFromDataIDHandleResponse(x: any): x is FromDataIDHandleResponse {
    return (typeof x.handleId !== "undefined") &&
            isAppendableDataMetadataBase(x);
}

export interface AppedableDataMetadata extends AppendableDataMetadataBase {
    filterLength: number;
}
function isAppendableDataMetadata(x: any): x is AppedableDataMetadata {
    return (typeof x.filterLength !== "undefined") &&
            isAppendableDataMetadataBase(x);
}


export class AppendableDataClient extends ApiClient {

    readonly adEndpoint: string;

    constructor(conf: ApiClientConfig){
        super(conf);

        this.adEndpoint = this.endpoint + "/appendable-data";
    }


    /**
     *
     * @param name - a 32-byte identifier encoded as a base64 string
     * @param isPrivate - defaults to false
     * @param filterType
     * @param filterKeys - list of signing key handles
     * @returns the appendable data handle
     */
    public async create(name: string,
                        isPrivate: boolean = false,
                        filterType = "BlackList",
                        filterKeys = []): Promise<AppendableDataId> {
        if (typeof name === "string") {
            name = crypto.createHash("sha256").update(name).digest("base64");
        }
        const recBody = {
            name: name,
            isPrivate: isPrivate,
            filterType: filterType,
            filterKeys: filterKeys
        };
        const result = await saneResponse(WebRequest.create<any>(
            this.adEndpoint, {
                method: "POST",
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                },
                body: recBody
            }).response);

        if (typeof result.content.handleId === "undefined") {
            throw new UnexpectedResponseContent(result);
        }
        return result.content.handleId;
    };

    /**
     *
     * @param id - the appendable data id to be converted
     * @returns a data id referring to the appendable data
     */
    public async toDataIdHandle(id: AppendableDataId): Promise<DataIDHandle> {
        const result = await saneResponse(WebRequest.create<any>(
            `${this.adEndpoint}/data-id/${id}`, {
                method: "GET",
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                }
            }).response);

        if (typeof result.content.handleId === "undefined") {
            throw new UnexpectedResponseContent(result);
        }
        return result.content.handleId;
    }


    /**
     *
     * @param handle - the appendable data handle
     * @param httpMethod
     */
    private async saveImpl(handle: AppendableDataId, httpMethod: "PUT" | "POST"): Promise<void> {
        const result = await saneResponse(WebRequest.create<any>(
            `${this.adEndpoint}/${handle}`, {
                method: httpMethod,
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                }
            }).response);

        if (result.statusCode !== 200) {
            throw new SafeError("Save failed.", result);
        }
    }

    /**
     * Save a new appendable data
     *
     * @param handle - the appendable data handle
     */
    public async save(handle: AppendableDataId): Promise<void> {
        return this.saveImpl(handle, "PUT");
    }

    /**
     * Update an existing appendable data
     *
     * @param handle - the appendable data handle
     */
    public async update(handle: AppendableDataId): Promise<void> {
        return this.saveImpl(handle, "POST");
    }

    /**
     *
     * @param id - the data id handle to be converted
     * @returns an appendable data id
     */
    public async fromDataIdHandle(id: DataIDHandle): Promise<FromDataIDHandleResponse> {

        const result = await saneResponse(WebRequest.create<any>(
            `${this.adEndpoint}/handle/${id}`, {
                method: "GET",
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                }
            }).response);

        if (isFromDataIDHandleResponse(result.content)) {
            return result.content;
        } else {
            throw new UnexpectedResponseContent(result);
        }
    }

    /**
     *
     * @param handle - the appendable data to append to
     * @param dataId - the data id handle to be appended
     */
    public async append(handle: AppendableDataId, dataId: DataIDHandle): Promise<void> {

        const result = await saneResponse(WebRequest.create<any>(
            `${this.adEndpoint}/${handle}/${dataId}`, {
                method: "PUT",
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                }
            }).response);

        if (result.statusCode !== 200) {
            throw new SafeError(
                `Failed to append data-id=${dataId} to appendable-data-handle=${handle}.`
                                , result);
        }
    }

    /**
     *
     * @param handle - the appendable data to append to
     * @param index - the index to get the data id from
     * @returns the `DataIDHandle` at the index
     */
    public async at(handle: AppendableDataId, index: number): Promise<DataIDHandle> {
        const result = await saneResponse(WebRequest.create<any>(
            `${this.adEndpoint}/${handle}/${index}`, {
                method: "GET",
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                }
            }).response);

        if (typeof result.content.handleId === "undefined") {
            throw new UnexpectedResponseContent(result);
        }
        return result.content.handleId;
    }

    /**
     *
     * @param handle - the appendable data to append to
     * @returns the metadata associated with the appendable data
     */
    public async getMetadata(handle: AppendableDataId): Promise<AppedableDataMetadata> {
        const result = await saneResponse(WebRequest.create<any>(
            `${this.adEndpoint}/metadata/${handle}`, {
                method: "GET",
                json: true,
                auth: {
                    bearer: (await this.authRes).token
                }
            }).response);
        if (isAppendableDataMetadata(result.content)) {
            return result.content;
        } else {
            throw new UnexpectedResponseContent(result);
        }

    }


}

