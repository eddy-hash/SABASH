import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('marketing_visits')
export class Visit {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'agent_id' }) agentId: string;
  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({ name: 'customer_name' }) customerName: string;
  @Column({ name: 'customer_phone' }) customerPhone: string;
  @Column() workplace: string;
  @Column('text', { nullable: true }) comments: string;
  @CreateDateColumn({ name: 'visit_date' }) visitDate: Date;
}
