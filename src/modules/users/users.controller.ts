// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  // Public registration endpoint (if your product allows user sign-up)
  @Post("register")
  create(@Body() dto: CreateUserDto) {
    return this.svc.create(dto);
  }

  // Protected: only authenticated users can get their own profile
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  me(@CurrentUser() user: any) {
    // CurrentUser decorator returns payload from JwtStrategy validate()
    return this.svc.findOne(user.sub);
  }

  // Protected: admin-only list of users
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("access-token")
  findAll() {
    return this.svc.findAll();
  }

  // Protected: get a user by id (you can make this public or protected depending on policy)
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }
}
