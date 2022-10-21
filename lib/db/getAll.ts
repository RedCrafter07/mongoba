import mongoose from 'mongoose';

export default async function getAllDBs(conn: mongoose.Connection) {
	return await (
		await conn.db.admin().listDatabases()
	).databases;
}
