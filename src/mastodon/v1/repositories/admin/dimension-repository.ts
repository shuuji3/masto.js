import type { MastoConfig } from '../../../../config';
import type { Http } from '../../../../http';
import type { Logger } from '../../../../logger';
import type { Admin } from '../../entities';
import type { DimensionKey } from '../../entities/admin';

export interface FetchDimensionParams {
  /**
   * Array of String. Request specific dimensions by their keystring. Supported dimensions include:
   *
   * - `languages` = Most-used languages on this server
   *
   * - `sources` = Most-used client apps on this server
   *
   * - `servers` = Remote servers with the most statuses
   *
   * - `space_usage` = How much space is used by your software stack
   *
   * - `software_versions` = The version numbers for your software stack
   *
   * - `tag_servers` = Most-common servers for statuses including a trending tag
   *
   * - `tag_languages` = Most-used languages for statuses including a trending tag
   *
   * - `instance_accounts` = Most-followed accounts from a remote server
   *
   * - `instance_languages` = Most-used languages from a remote server
   */
  readonly keys: DimensionKey[];
  /** String (ISO 8601 Datetime). The start date for the time period. If a time is provided, it will be ignored. */
  readonly startAt?: string | null;
  /** String (ISO 8601 Datetime). The end date for the time period. If a time is provided, it will be ignored. */
  readonly endAt?: string | null;
  /** Integer. The maximum number of results to return for sources, servers, languages, tag or instance dimensions. */
  readonly limit?: string | null;
  readonly tagServers?: {
    /** String. When `tag_servers` is one of the requested keys, you must provide a trending tag ID to obtain information about which servers are posting the tag. */
    readonly id?: string | null;
  } | null;
  readonly tagLanguages?: {
    /** String. When `tag_languages` is one of the requested keys, you must provide a trending tag ID to obtain information about which languages are posting the tag. */
    readonly id?: string | null;
  } | null;
  readonly instanceAccounts?: {
    /** String. When `instance_accounts` is one of the requested keys, you must provide a domain to obtain information about popular accounts from that server. */
    readonly domain?: string | null;
  } | null;
  readonly instanceLanguages?: {
    /** String. When `instance_accounts` is one of the requested keys, you must provide a domain to obtain information about popular languages from that server. */
    readonly domain?: string | null;
  } | null;
}

export class DimensionRepository {
  constructor(
    private readonly http: Http,
    readonly config: MastoConfig,
    readonly logger?: Logger,
  ) {}

  /**
   * Obtain information about popularity of certain accounts, servers, languages, etc.
   * @see https://docs.joinmastodon.org/methods/admin/dimensions/#get
   */
  fetch(params: FetchDimensionParams): Promise<Admin.Dimension[]> {
    return this.http.post('/api/v1/admin/dimensions', params, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}
