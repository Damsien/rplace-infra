import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PixelEntity } from "./pixel.entity";
import { UserEntity } from "./user.entity";

@Entity()
export class PixelHistoryEntity {

    @PrimaryGeneratedColumn('increment')
    id: number

    @Column('int')
    @ManyToOne(() => PixelEntity)
    @JoinColumn({ name: "pixelId" })
    pixelId: number;

    @Column('date')
    date: Date;

    @Column('text')
    color: string;

    @Column('text')
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: "userId" })
    userId: string;

}