import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) company: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
