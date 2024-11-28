class S3Manager {
  static instance: S3Manager;

  static getInstance() {
    if (!this.instance) {
      this.instance = new S3Manager();
    }
    return this.instance;
  }

  async getDataFromS3() {}

  async uploadTranscodedData() {}
}
