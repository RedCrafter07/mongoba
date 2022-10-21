import mongoose from 'mongoose';

export default async function getDocuments(
	inp: {
		db: string;
		collections: string[];
	}[],
	conn: mongoose.Connection,
) {
	return (
		await Promise.all(
			inp.map(async (db) => {
				const documents = await Promise.all(
					db.collections.map(async (collection) => {
						const documents = await conn
							.useDb(db.db)
							.collection(collection)
							.find({})
							.toArray();
						return { collection, documents };
					}),
				);
				return { db: db.db, collections: documents };
			}),
		)
	).filter(
		(d) => d.collections.filter((c) => c.documents.length > 0).length > 0,
	);
}
