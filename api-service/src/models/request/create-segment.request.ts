import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class SegmentRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  operator!: string;

  @ApiProperty()
  @IsNotEmpty()
  value!: any;
}

export class CreateSegmentDto {
  @ApiProperty({ example: 'High-Value Customers' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Users who have spent over $500' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [SegmentRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentRuleDto)
  rules!: SegmentRuleDto[];

  @ApiProperty({ enum: ['AND', 'OR'], required: false, default: 'AND' })
  @IsOptional()
  @IsIn(['AND', 'OR'])
  logicalOperator?: 'AND' | 'OR';
}