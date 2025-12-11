interface getItemsArgs {
  limit: number;
  period: string;
  page: number;
  offset?: number;
  artist_id?: number;
  album_id?: number;
  track_id?: number;
}
interface getActivityArgs {
  step: string;
  range: number;
  month: number;
  year: number;
  artist_id: number;
  album_id: number;
  track_id: number;
}

async function request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: "include",
    ...init,
  });
}

// Helper to build query string skipping undefined/null
function buildQuery(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

async function handleJson<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const err = await r.json();
    throw Error(err.error);
  }
  return (await r.json()) as T;
}
async function getLastListens(
  args: getItemsArgs
): Promise<PaginatedResponse<Listen>> {
  const query = buildQuery({
    period: args.period,
    limit: args.limit,
    artist_id: args.artist_id,
    album_id: args.album_id,
    track_id: args.track_id,
    page: args.page,
    offset: args.offset || 0
  });
  const r = await request(`/apis/web/v1/listens?${query}`);
  return handleJson<PaginatedResponse<Listen>>(r);
}

async function getTopTracks(
  args: getItemsArgs
): Promise<PaginatedResponse<Track>> {
  const query = buildQuery({
    period: args.period,
    limit: args.limit,
    page: args.page,
    artist_id: args.artist_id,
    album_id: args.album_id
  });
  const r = await request(`/apis/web/v1/top-tracks?${query}`);
  return handleJson<PaginatedResponse<Track>>(r);
}

async function getTopAlbums(
  args: getItemsArgs
): Promise<PaginatedResponse<Album>> {
  const query = buildQuery({
    period: args.period,
    limit: args.limit,
    page: args.page,
    artist_id: args.artist_id
  });
  const r = await request(`/apis/web/v1/top-albums?${query}`);
  return handleJson<PaginatedResponse<Album>>(r);
}

async function getTopArtists(
  args: getItemsArgs
): Promise<PaginatedResponse<Artist>> {
  const query = buildQuery({
    period: args.period,
    limit: args.limit,
    page: args.page
  });
  const r = await request(`/apis/web/v1/top-artists?${query}`);
  return handleJson<PaginatedResponse<Artist>>(r);
}

async function getActivity(
  args: getActivityArgs
): Promise<ListenActivityItem[]> {
  const query = buildQuery({
    step: args.step,
    range: args.range,
    month: args.month,
    year: args.year,
    album_id: args.album_id,
    artist_id: args.artist_id,
    track_id: args.track_id
  });
  const r = await request(`/apis/web/v1/listen-activity?${query}`);
  return handleJson<ListenActivityItem[]>(r);
}

async function getStats(period: string): Promise<Stats> {
  const r = await request(`/apis/web/v1/stats?period=${period}`);

  return handleJson<Stats>(r);
}

function search(q: string): Promise<SearchResponse> {
  q = encodeURIComponent(q);
  return request(`/apis/web/v1/search?q=${q}`).then(
    (r) => r.json() as Promise<SearchResponse>
  );
}

function imageUrl(id: string, size: string) {
  if (!id) {
    id = "default";
  }
  return `/images/${size}/${id}`;
}
function replaceImage(form: FormData): Promise<Response> {
  return request(`/apis/web/v1/replace-image`, {
    method: "POST",
    body: form,
  });
}

function mergeTracks(from: number, to: number): Promise<Response> {
  return request(`/apis/web/v1/merge/tracks?from_id=${from}&to_id=${to}`, {
    method: "POST",
  });
}
function mergeAlbums(
  from: number,
  to: number,
  replaceImage: boolean
): Promise<Response> {
  return request(
    `/apis/web/v1/merge/albums?from_id=${from}&to_id=${to}&replace_image=${replaceImage}`,
    {
      method: "POST",
    }
  );
}
function mergeArtists(
  from: number,
  to: number,
  replaceImage: boolean
): Promise<Response> {
  return request(
    `/apis/web/v1/merge/artists?from_id=${from}&to_id=${to}&replace_image=${replaceImage}`,
    {
      method: "POST",
    }
  );
}
function login(
  username: string,
  password: string,
  remember: boolean
): Promise<Response> {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  form.append("remember_me", String(remember));
  return request(`/apis/web/v1/login`, {
    method: "POST",
    body: form,
  });
}
function logout(): Promise<Response> {
  return request(`/apis/web/v1/logout`, {
    method: "POST",
  });
}

function getCfg(): Promise<Config> {
  return request(`/apis/web/v1/config`).then((r) => r.json() as Promise<Config>);
}

function submitListen(id: string, ts: Date): Promise<Response> {
  const form = new URLSearchParams();
  form.append("track_id", id);
  const ms = new Date(ts).getTime();
  const unix = Math.floor(ms / 1000);
  form.append("unix", unix.toString());
  return request(`/apis/web/v1/listen`, {
    method: "POST",
    body: form,
  });
}

function getApiKeys(): Promise<ApiKey[]> {
  return request(`/apis/web/v1/user/apikeys`).then(
    (r) => r.json() as Promise<ApiKey[]>
  );
}
const createApiKey = async (label: string): Promise<ApiKey> => {
  const form = new URLSearchParams();
  form.append("label", label);
  const r = await request(`/apis/web/v1/user/apikeys`, {
    method: "POST",
    body: form,
  });
  if (!r.ok) {
    let errorMessage = `error: ${r.status}`;
    try {
      const errorData: ApiError = await r.json();
      if (errorData && typeof errorData.error === "string") {
        errorMessage = errorData.error;
      }
    } catch (e) {
      console.error("unexpected api error:", e);
    }
    throw new Error(errorMessage);
  }
  const data: ApiKey = await r.json();
  return data;
};
function deleteApiKey(id: number): Promise<Response> {
  return request(`/apis/web/v1/user/apikeys?id=${id}`, {
    method: "DELETE",
  });
}
function updateApiKeyLabel(id: number, label: string): Promise<Response> {
  const form = new URLSearchParams();
  form.append("id", String(id));
  form.append("label", label);
  return request(`/apis/web/v1/user/apikeys`, {
    method: "PATCH",
    body: form,
  });
}

function deleteItem(itemType: string, id: number): Promise<Response> {
  return request(`/apis/web/v1/${itemType}?id=${id}`, {
    method: "DELETE",
  });
}
function updateUser(username: string, password: string, currentPassword?: string) {
  let body = new URLSearchParams()
  if (username !== "") {
    body.append('username', username)
  }
  if (password !== "") {
    body.append('password', password)
    if (currentPassword) {
      body.append('current_password', currentPassword)
    }
  }
  return request("/apis/web/v1/user", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body,
  })
}
function getAliases(type: string, id: number): Promise<Alias[]> {
  return request(`/apis/web/v1/aliases?${type}_id=${id}`).then(
    (r) => r.json() as Promise<Alias[]>
  );
}
function createAlias(
  type: string,
  id: number,
  alias: string
): Promise<Response> {
  const form = new URLSearchParams();
  form.append(`${type}_id`, String(id));
  form.append("alias", alias);
  return request(`/apis/web/v1/aliases`, {
    method: "POST",
    body: form,
  });
}
function deleteAlias(
  type: string,
  id: number,
  alias: string
): Promise<Response> {
  const form = new URLSearchParams();
  form.append(`${type}_id`, String(id));
  form.append("alias", alias);
  return request(`/apis/web/v1/aliases/delete`, {
    method: "POST",
    body: form,
  });
}
function setPrimaryAlias(
  type: string,
  id: number,
  alias: string
): Promise<Response> {
  const form = new URLSearchParams();
  form.append(`${type}_id`, String(id));
  form.append("alias", alias);
  return request(`/apis/web/v1/aliases/primary`, {
    method: "POST",
    body: form,
  });
}
function getAlbum(id: number): Promise<Album> {
  return request(`/apis/web/v1/album?id=${id}`).then(
    (r) => r.json() as Promise<Album>
  );
}

function deleteListen(listen: Listen): Promise<Response> {
  const ms = new Date(listen.time).getTime();
  const unix = Math.floor(ms / 1000);
  return request(`/apis/web/v1/listen?track_id=${listen.track.id}&unix=${unix}`, {
    method: "DELETE",
  });
}
function getExport() { }

function getNowPlaying(): Promise<NowPlaying> {
  return request("/apis/web/v1/now-playing").then((r) => r.json());
}


function spotifySearch(q: string, type: "artist" | "album" | "track"): Promise<SpotifySearchResponse> {
  q = encodeURIComponent(q);
  return request(`/apis/web/v1/spotify/search?q=${q}&type=${type}`).then(
    (r) => r.json() as Promise<SpotifySearchResponse>
  );
}

function getSpotifyConfigured(): Promise<{ configured: boolean }> {
  return request(`/apis/web/v1/spotify/configured`).then(
    (r) => r.json() as Promise<{ configured: boolean }>
  );
}

function fetchSpotifyMetadata(id: number, type: "artist" | "album" | "track", spotifyId?: string): Promise<Response> {
  let url = `/apis/web/v1/spotify/fetch-metadata?id=${id}&type=${type}`;
  if (spotifyId) url += `&spotify_id=${spotifyId}`;
  return request(url, { method: "POST" });
}

function exportSpotifyMetadata(): Promise<Blob> {
  return request(`/apis/web/v1/spotify/export-metadata`).then(r => r.blob());
}

function importSpotifyMetadata(file: File): Promise<{ message: string; artists_updated: number; albums_updated: number; tracks_updated: number }> {
  return file.text().then(text =>
    request(`/apis/web/v1/spotify/import-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    }).then(r => r.json())
  );
}


export {
  getLastListens,
  getTopTracks,
  getTopAlbums,
  getTopArtists,
  getActivity,
  getStats,
  search,
  replaceImage,
  mergeTracks,
  mergeAlbums,
  mergeArtists,
  imageUrl,
  login,
  logout,
  getCfg,
  deleteItem,
  updateUser,
  getAliases,
  createAlias,
  deleteAlias,
  setPrimaryAlias,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  updateApiKeyLabel,
  deleteListen,
  getAlbum,
  getExport,
  submitListen,
  getNowPlaying,
  spotifySearch,
  getSpotifyConfigured,
  fetchSpotifyMetadata,
  exportSpotifyMetadata,
  importSpotifyMetadata,
  signup,
  getAllUsers,
  createUser,
  adminUpdateUser,
  adminDeleteUser,
  getClientSources,
};

function signup(username: string, password: string): Promise<User> {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  return request(`/apis/web/v1/signup`, {
    method: "POST",
    body: form,
  }).then((r) => r.json() as Promise<User>);
}

function getAllUsers(): Promise<User[]> {
  return request(`/apis/web/v1/admin/users`).then((r) => r.json() as Promise<User[]>);
}

function createUser(username: string, password: string, role: string): Promise<User> {
  return request(`/apis/web/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  }).then((r) => r.json() as Promise<User>);
}

function adminUpdateUser(id: number, opts: { username?: string, password?: string, role?: string }): Promise<Response> {
  const payload: { role?: string; password?: string } = {};
  if (opts.password) payload.password = opts.password;
  if (opts.role) payload.role = opts.role;
  return request(`/apis/web/v1/admin/users?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function adminDeleteUser(id: number): Promise<Response> {
  return request(`/apis/web/v1/admin/users?id=${id}`, {
    method: "DELETE",
  });
}

function getClientSources(): Promise<ClientSource[]> {
  return request(`/apis/web/v1/user/client-sources`).then((r) => r.json() as Promise<ClientSource[]>);
}
type Track = {
  id: number;
  title: string;
  artists: SimpleArtists[];
  listen_count: number;
  image: string;
  album_id: number;
  musicbrainz_id: string;
  time_listened: number;
  first_listen: number;
  album?: string;
  popularity?: number;
  spotify_id?: string;
  // Audio Features from Spotify
  danceability?: number;
  energy?: number;
  key?: number;
  loudness?: number;
  mode?: number;
  speechiness?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  valence?: number;
  tempo?: number;
};
type Artist = {
  id: number;
  name: string;
  image: string;
  aliases: string[];
  listen_count: number;
  musicbrainz_id: string;
  time_listened: number;
  first_listen: number;
  is_primary: boolean;
  genres?: string[];
  bio?: string;
  popularity?: number;
  spotify_id?: string;
  followers?: number;
};
type Album = {
  id: number;
  title: string;
  image: string;
  listen_count: number;
  is_various_artists: boolean;
  artists: SimpleArtists[];
  musicbrainz_id: string;
  time_listened: number;
  first_listen: number;
  genres?: string[];
  release_date?: string;
  popularity?: number;
  spotify_id?: string;
  label?: string;
};
type Alias = {
  id: number;
  alias: string;
  source: string;
  is_primary: boolean;
};
type Listen = {
  time: string;
  track: Track;
};
type PaginatedResponse<T> = {
  items: T[];
  total_record_count: number;
  has_next_page: boolean;
  current_page: number;
  items_per_page: number;
};
type ClientSource = {
  id: number;
  user_id: number;
  name: string;
  token: string;
  last_seen: Date;
  config: string;
  created_at: Date;
};
type ListenActivityItem = {
  start_time: Date;
  listens: number;
  start_time_unix: number;
};
type SimpleArtists = {
  name: string;
  id: number;
};
type Stats = {
  listen_count: number;
  track_count: number;
  album_count: number;
  artist_count: number;
  minutes_listened: number;
};
type SearchResponse = {
  albums: Album[];
  artists: Artist[];
  tracks: Track[];
};
type User = {
  id: number;
  username: string;
  role: "user" | "admin";
};
type ApiKey = {
  id: number;
  key: string;
  label: string;
  created_at: Date;
};
type ApiError = {
  error: string;
  details?: string;
};
type Config = {
  default_theme: string;
  version?: string;
};
type NowPlaying = {
  currently_playing: boolean;
  track: Track;
};
type SpotifyImage = {
  url: string;
  width: number;
  height: number;
};
type SpotifySearchResult = {
  id: string;
  name: string;
  artists?: string[];
  images: SpotifyImage[];
  type: string;
};
type SpotifySearchResponse = {
  results: SpotifySearchResult[];
};

export type {
  getItemsArgs,
  getActivityArgs,
  Track,
  Artist,
  Album,
  Listen,
  SearchResponse,
  PaginatedResponse,
  ListenActivityItem,
  User,
  Alias,
  ApiKey,
  ApiError,
  Config,
  NowPlaying,
  Stats,
  SpotifySearchResponse,
  SpotifySearchResult,
};

