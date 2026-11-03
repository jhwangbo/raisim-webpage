export class SerialTasks {
  constructor() {
    this.jobs = [];
    this.active = false;
  }

  run(action) {
    return new Promise((resolve, reject) => {
      this.jobs.push({action,resolve,reject});
      this.pump();
    });
  }

  pump() {
    if (this.active || !this.jobs.length) return;
    this.active = true;
    const job = this.jobs.shift();
    let result;
    try { result = job.action(); } catch (error) { result = Promise.reject(error); }
    Promise.resolve(result).then(job.resolve,job.reject).finally(() => {
      this.active = false;
      this.pump();
    });
  }
}
