import { BadGatewayException } from '@nestjs/common';

/** 제공자 자체 안전장치의 차단을 일반 네트워크 오류와 구분합니다. */
export class LLMModerationException extends BadGatewayException {
  constructor() {
    super('부적절하거나 허용되지 않은 내용이 감지되어 분석을 진행할 수 없어.');
  }
}
