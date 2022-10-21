# Mongoba

Welcome to Mongoba!

## What is Mongoba?

Mongoba is a simple CLI tool for backing up your MongoDB databases. It is written in Typescript and uses Mongoose for connecting to MongoDB. It backups your MongoDB databases to a local json file and has options to encrypt it with a custom key.

## Why is it called Mongoba?

Mongoba is a combination of the words MongoDB and Backup.

## Installation

Mongoba is available on the npm registry. You can install it using the following command:

With pnpm:

```bash
pnpm i -g mongoba
```

With yarn:

```bash
yarn global add mongoba
```

With npm:

```bash
npm i -g mongoba
```

## Usage

### Backup (Mongoba)

You can use Mongoba by running the following command:

```bash
mongoba
```

Then, you'll be prompted to enter some required information about your MongoDB database and the backup file.

### Decrypting (Mongobad)

When you install mongoba, mongobad is automatically available in your terminal. It stands for mongoba decrypt and it is used to decrypt the backup file, if you choose to encrypt it. You can use it by running the following command:

```bash
mongobad
```

After executing the command, you'll be prompted to enter the path to the backup file and the password you used to encrypt it. Also, some available options will be displayed.

### Restoring (Mongobar)

As well as the other two commands, mongobar is also available in your terminal. It stands for mongoba restore and it is used to restore the backup file to your MongoDB database. You can use it by running the following command:

```bash
mongobar
```

It's self explanatory. It's a simple way to restore a backup file to your MongoDB database.

### Purging (Mongobap)

This command is available too! If you did something wrong and need to delete it, e.g. restored the wrong backup, you can use mongobap.

```bash
mongobap
```

And there you go!

## License

Mongoba is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for more information.

## Contributing

If you want to contribute to Mongoba, you can do so by forking the repository and submitting a pull request. You can also open an issue if you find a bug or have a feature request.
