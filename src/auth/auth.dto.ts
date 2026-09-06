import {
  IsEmail,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * Corps attendu par `POST /auth/register`.
 * Les noms sont en camelCase côté API et sont mappés vers `firstname` /
 * `lastname` en base au moment de la création du membre.
 *
 * Ce sont des CLASSES (et non des interfaces) : le `ValidationPipe` global ne
 * peut valider que ce qui existe à l'exécution.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  // 8 caractères minimum : plancher raisonnable sans bloquer les mots de passe
  // longs (bcrypt gère jusqu'à 72 octets, d'où le plafond).
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[^<>]*$/, { message: 'Le prénom contient des caractères interdits.' })
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[^<>]*$/, { message: 'Le nom contient des caractères interdits.' })
  lastName!: string;

  @IsInt({ message: 'branchId doit être un entier.' })
  branchId!: number;
}

/** Corps attendu par `POST /auth/login`. */
export class LoginDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Mot de passe requis.' })
  @MaxLength(72)
  password!: string;
}
