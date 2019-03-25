import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import * as LinkHeader from 'http-link-header';
import * as querystring from 'querystring';
import { oc } from 'ts-optchain';
import { MastodonNotFoundError } from '../errors/mastodon-not-found-error';
import { MastodonRateLimitError } from '../errors/mastodon-rate-limit-error';
import { MastodonUnauthorizedError } from '../errors/mastodon-unauthorized-error';
import { StreamingHandler } from './streaming-handler';

/** Type to determine whether paginate-able entity */
export type Paginatable = string[] | { id: string }[];

export type PaginateNextOptions<Params> = {
  /** Reset pagination */
  reset?: boolean;

  /** URL */
  url?: string;

  /** Query parameters */
  params?: Params;
};

export interface GatewayConstructor {
  uri: string;
  streamingApiUrl?: string;
  version?: string;
  accessToken?: string;
}

const normalizeUrl = (url: string) => {
  // Remove trailing slash
  return url.replace(/\/$/, '');
};

/**
 * Mastodon network request wrapper
 * @param options Optional params
 * @param options.url URL of the instance
 * @param options.streamingUrl Streaming API URL of the instance
 * @param options.token API token of the user
 */
export class Gateway {
  /** URI of the instance */
  private _uri = '';

  /** Version of the current instance */
  private _version = '';

  /** Streaming API URL of the instance */
  private _streamingApiUrl = '';

  /** API token of the user */
  private _accessToken = '';

  protected constructor(params: GatewayConstructor) {
    this._uri = normalizeUrl(params.uri);

    if (params.streamingApiUrl) {
      this._streamingApiUrl = params.streamingApiUrl;
    }

    if (params.version) {
      this._version = params.version;
    }

    if (params.accessToken) {
      this._accessToken = params.accessToken;
    }
  }

  /** Getter for this._uri */
  public get uri() {
    return this._uri;
  }

  /** Setter for this._uri */
  public set uri(newUri: string) {
    this._uri = normalizeUrl(newUri);
  }

  /** Getter for this._version  */
  public get version() {
    return this._version;
  }

  /** Setter for this._version */
  public set version(newVersion: string) {
    this._version = newVersion;
  }

  /** Getter for this._streamingApiUrl */
  public get streamingApiUrl() {
    return this._streamingApiUrl;
  }

  /** Setter for this._streamingApiUrl */
  public set streamingApiUrl(newStreamingApiUrl: string) {
    this._streamingApiUrl = normalizeUrl(newStreamingApiUrl);
  }

  /** Getter for this._accessToken */
  public get accessToken() {
    return this._accessToken;
  }

  /** Setter for this._accessToken */
  public set accessToken(newAccessToken: string) {
    this._accessToken = newAccessToken;
  }

  /**
   * Encode data in request options and add authorization / content-type header
   * @param data Any data
   * @param options Axios options
   */
  private decorateRequestConfig(
    data: any,
    options: AxiosRequestConfig = {},
  ): AxiosRequestConfig | void {
    if (!options.headers) {
      options.headers = {};
    }

    // Set `application/json` as the default
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    // Add oauth header
    if (this.accessToken) {
      options.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    switch (options.headers['Content-Type']) {
      case 'application/json':
        options.data = JSON.stringify(data);

        return options;

      case 'multipart/form-data':
        const formData = new FormData();

        for (const [key, value] of Object.entries(data)) {
          formData.append(key, value);
        }

        options.data = formData;
        options.headers = { ...options.headers, ...formData.getHeaders() };

        return options;

      default:
        return;
    }
  }

  /**
   * Wrapper function for Axios
   * @param options Axios options
   * @param parse Whether parse response before return
   * @return Parsed response object
   */
  protected async request<T>(
    options: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    options.transformResponse = [
      (data: any) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      },
    ];

    try {
      return await axios.request<T>(options);
    } catch (error) {
      const status = oc(error.response.status)();

      // Error response from REST API might contain error key
      // https://docs.joinmastodon.org/api/entities/#error
      const errorMessage = oc(error.response.data.error)(
        'Unexpected error occurred',
      );

      switch (status) {
        case 401:
          throw new MastodonUnauthorizedError(errorMessage);
        case 404:
          throw new MastodonNotFoundError(errorMessage);
        case 429:
          throw new MastodonRateLimitError(errorMessage);
        default:
          throw error;
      }
    }
  }

  /**
   * HTTP GET
   * @param url URL to request
   * @param params Query strings
   * @param options Fetch API options
   * @param parse Whether parse response before return
   */
  protected get<T>(
    url: string,
    params: { [key: string]: any } = {},
    options?: AxiosRequestConfig,
  ) {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...options,
      ...this.decorateRequestConfig({}, options),
    });
  }

  /**
   * HTTP POST
   * @param url URL to request
   * @param data Payload
   * @param options Fetch API options
   * @param parse Whether parse response before return
   */
  protected post<T>(url: string, data: any = {}, options?: AxiosRequestConfig) {
    return this.request<T>({
      method: 'POST',
      url,
      ...options,
      ...this.decorateRequestConfig(data, options),
    });
  }

  /**
   * HTTP PUT
   * @param url URL to request
   * @param data Payload
   * @param options Fetch API options
   * @param parse Whether parse response before return
   */
  protected put<T>(url: string, data: any = {}, options?: AxiosRequestConfig) {
    return this.request<T>({
      method: 'PUT',
      url,
      ...options,
      ...this.decorateRequestConfig(data, options),
    });
  }

  /**
   * HTTP DELETE
   * @param url URL to request
   * @param data jPayload
   * @param options Fetch API options
   * @param parse Whether parse response before return
   */
  protected delete<T>(
    url: string,
    data: any = {},
    options?: AxiosRequestConfig,
  ) {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...options,
      ...this.decorateRequestConfig(data, options),
    });
  }

  /**
   * HTTP PATCH
   * @param url URL to request
   * @param data Payload
   * @param options Fetch API options
   * @param parse Whether parse response before return
   */
  protected patch<T>(
    url: string,
    data: any = {},
    options?: AxiosRequestConfig,
  ) {
    return this.request<T>({
      method: 'PATCH',
      url,
      ...options,
      ...this.decorateRequestConfig(data, options),
    });
  }

  /**
   * Connect to a streaming
   * @param id ID of the channel, e.g. `public`, `user`, `public:local`
   * @return Instance of EventEmitter
   */
  protected stream(url: string, params: { [key: string]: any } = {}) {
    if (this.accessToken) {
      params.access_token = this.accessToken;
    }

    return new StreamingHandler().connect(
      url +
        (Object.keys(params).length ? `?${querystring.stringify(params)}` : ''),
    );
  }

  /**
   * Generate an iterable of the pagination.
   * The default generator implementation of JS cannot change the value of `done` depend on the result of yield,
   * Therefore we define custom generator to reproduce Mastodon's link header behaviour faithfully.
   * @param initialUrl URL for the endpoint
   * @param initialParams Query parameter
   * @return Async iterable iterator of the pages.
   * See also [MDN article about generator/iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators)
   */
  protected paginate<Data extends Paginatable, Params = any>(
    initialUrl: string,
    initialParams?: Params,
  ): AsyncIterableIterator<AxiosResponse<Data> | undefined> {
    const get = this.get.bind(this);

    let url: string = initialUrl;
    let params: Params | undefined = initialParams;

    return {
      async next(value?: PaginateNextOptions<Params>) {
        if (oc(value).reset()) {
          url = initialUrl;
          params = initialParams;
        }

        if (!url) {
          return { done: true, value: undefined };
        }

        const response = await get<Data>(
          oc(value).url(url),
          oc(value).params() || params,
        );

        // Set next url from the link header
        const link = oc(response.headers.link)('');
        const next = LinkHeader.parse(link).refs.find(
          ({ rel }) => rel === 'next',
        );

        url = oc(next).uri('');
        params = undefined;

        // Return `done: true` immediately if no next url returned
        return { done: !url, value: response };
      },

      async return(value: AxiosResponse<Data>) {
        return { value, done: true };
      },

      async throw(error?: Error) {
        throw error;
      },

      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
}