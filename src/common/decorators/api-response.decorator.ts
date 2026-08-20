import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api-response.dto';

export const ApiStandardResponse = <DataDto extends Type<unknown>>(
  dataDto?: DataDto,
) => {
  const decorators = [ApiExtraModels(ApiResponseDto)];

  if (dataDto) {
    decorators.push(ApiExtraModels(dataDto));
    decorators.push(
      ApiOkResponse({
        schema: {
          allOf: [
            { $ref: getSchemaPath(ApiResponseDto) },
            {
              properties: {
                data: {
                  $ref: getSchemaPath(dataDto),
                },
              },
            },
          ],
        },
      }),
    );
  } else {
    decorators.push(
      ApiOkResponse({
        schema: {
          allOf: [
            { $ref: getSchemaPath(ApiResponseDto) },
            {
              properties: {
                data: {
                  nullable: true,
                  example: null,
                },
              },
            },
          ],
        },
      }),
    );
  }

  return applyDecorators(...decorators);
};
