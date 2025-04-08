import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class OTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User; //user which the otp was generated for

  @Column()
  code: string; //6digit code


  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiresAt: Date;// 5 minutes after creation if not used

   // Set expiry time (5 minutes from now) using native Date
   @BeforeInsert()
   setExpiryDate() {
     const expiryTime = new Date();
     expiryTime.setMinutes(expiryTime.getMinutes() + 5); // Add 5 minutes tothe 
     this.expiresAt = expiryTime;
   }
}