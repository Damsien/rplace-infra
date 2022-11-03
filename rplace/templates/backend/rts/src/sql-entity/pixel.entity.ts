import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PixelEntity {

    @PrimaryGeneratedColumn("increment")
    pixelId: number;

    @Column('int')
    coord_x: number;

    @Column('int')
    coord_y: number;

}