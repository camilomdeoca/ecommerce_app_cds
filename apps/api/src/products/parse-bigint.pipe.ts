import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      throw new BadRequestException("Product id must be a positive integer");
    }

    return BigInt(value);
  }
}
