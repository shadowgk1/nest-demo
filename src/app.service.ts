import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  getFuck(): string {
    return 'Fuck World!';
  }
}
