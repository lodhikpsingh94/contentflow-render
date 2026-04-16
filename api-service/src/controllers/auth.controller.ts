// C:\...\api-service\src\controllers\auth.controller.ts

import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private jwtService: JwtService) {}

  @Post('login')
  async login(@Body() loginDto: any, @Res() res: Response) {
    // --- IMPORTANT ---
    // In a real application, you would validate the loginDto.email and loginDto.password
    // against a user database here.
    // For our demo, we will accept any login and return a valid token.

    if (!loginDto.email || !loginDto.password) {
        return res.status(HttpStatus.BAD_REQUEST).json({
            message: 'Email and password are required',
        });
    }

    const payload = {
      // This is the data that will be encoded in the JWT
      userId: 'user_12345', // A mock user ID
      tenantId: 'tenant1',   // A mock tenant ID
      roles: ['admin', 'editor'], // Mock user roles
    };

    const accessToken = this.jwtService.sign(payload);

    return res.status(HttpStatus.OK).json({
      message: 'Login successful',
      token: accessToken,
    });
  }
}