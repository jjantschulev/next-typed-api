export function redirect(url: string, statusCode = 307): never {
  throw new RedirectError(url, statusCode);
}

export class RedirectError {
  public readonly url: string;
  public readonly statusCode: number;
  constructor(url: string, statusCode = 307) {
    this.url = url;
    this.statusCode = statusCode;
  }
}
