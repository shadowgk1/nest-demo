import { Test, TestingModule } from '@nestjs/testing';
import { RagdbService } from './ragdb.service';

describe('RagdbService', () => {
  let service: RagdbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagdbService],
    }).compile();

    service = module.get<RagdbService>(RagdbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
