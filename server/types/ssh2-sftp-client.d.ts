declare module 'ssh2-sftp-client' {
  interface ConnectOptions {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string | Buffer;
    passphrase?: string;
    readyTimeout?: number;
    strictVendor?: boolean;
    debug?: (information: string) => void;
  }

  interface FileInfo {
    type: string;
    name: string;
    size: number;
    modifyTime: number | string;
    accessTime: number | string;
    rights: {
      user: string;
      group: string;
      other: string;
    };
    owner: number | string;
    group: number | string;
  }

  export interface FileStats {
    mode: number;
    uid: number;
    gid: number;
    size: number;
    accessTime: number | Date;
    modifyTime: number | Date;
    isDirectory: boolean;
    isFile: boolean;
    isBlockDevice: boolean;
    isCharacterDevice: boolean;
    isSymbolicLink: boolean;
    isFIFO: boolean;
    isSocket: boolean;
  }

  class SFTPClient {
    connect(options: ConnectOptions): Promise<SFTPClient>;
    list(remoteFilePath: string): Promise<FileInfo[]>;
    exists(path: string): Promise<boolean | string>;
    stat(remotePath: string): Promise<FileStats>;
    get(path: string): Promise<Buffer>;
    put(localPath: string | Buffer, remotePath: string): Promise<string>;
    mkdir(remotePath: string, recursive?: boolean): Promise<string>;
    rmdir(remotePath: string): Promise<string>;
    delete(remotePath: string): Promise<string>;
    rename(fromPath: string, toPath: string): Promise<string>;
    chmod(remotePath: string, mode: number): Promise<string>;
    end(): Promise<void>;
  }

  export default SFTPClient;
}