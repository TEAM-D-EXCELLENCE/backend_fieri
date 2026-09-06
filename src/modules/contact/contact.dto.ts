import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Corps de `POST /contact`. Endpoint public non authentifié : chaque champ est
 * borné pour couper le spam et les charges utiles démesurées.
 */
export class ContactMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;
}
