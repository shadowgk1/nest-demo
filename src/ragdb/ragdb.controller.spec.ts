import { Test, TestingModule } from '@nestjs/testing';
import { RagdbController } from './ragdb.controller';

describe('RagdbController', () => {
  let controller: RagdbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagdbController],
    }).compile();

    controller = module.get<RagdbController>(RagdbController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
