import "dotenv/config";
import {prisma} from "../src/lib/prisma/client";

async function main(): Promise<void> {
    const rooms = [
        {
            name: "Orion",
            capacity: 4,
            location: "Floor 2",
        },
        {
            name: "Andromeda",
            capacity: 8,
            location: "Floor 2",
        },
        {
            name: "Apollo",
            capacity: 12,
            location: "Floor 3",
        },
    ];

    for (const room of rooms) {
        await prisma.room.upsert({
            where: {name: room.name},
            update: room,
            create: room,
        });
    }

    console.log("Room seed completed.");
}

main()
    .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });