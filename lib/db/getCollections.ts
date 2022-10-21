import mongoose from 'mongoose';

export default async function getCollections(
	dbs: string[],
	conn: mongoose.Connection,
) {
	return await Promise.all(
		dbs.map(async (db) => {
			const collections = await (
				await conn.useDb(db).db.listCollections().toArray()
			).map((collection) => collection.name);
			return { db, collections };
		}),
	);
}
