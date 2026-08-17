import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint : POST /auth/register
   * Body : { email, password, firstName, lastName, branchId }
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerData: RegisterDto) {
    return this.authService.register(registerData);
  }

  /**
   * Endpoint : POST /auth/login
   * Body : { email, password }
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData.email, loginData.password);
  }
}
