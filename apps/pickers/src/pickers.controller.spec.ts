import { Test, TestingModule } from '@nestjs/testing';
import { PickersController } from './pickers.controller';
import { PickersService } from './pickers.service';

describe('PickersController', () => {
  let pickersController: PickersController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PickersController],
      providers: [PickersService],
    }).compile();

    pickersController = app.get<PickersController>(PickersController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pickersController.getHello()).toBe('Hello World!');
    });
  });
});
