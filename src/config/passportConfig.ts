import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User, { IUser } from '../models/User';
import { encryptToken } from '../services/encryptionService';

// Initialize passport with GitHub strategy
export function initializePassport(): void {
  // GitHub OAuth Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        callbackURL: process.env.GITHUB_CALLBACK_URL || '',
        scope: ['user:email', 'public_repo'],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (error: any, user?: any) => void
      ) => {
        try {
          const githubId = profile.id;
          const githubUsername = profile.username || profile.login;
          const primaryEmail =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : undefined;

          // Encrypt the access token before storing
          const encryptedToken = encryptToken(accessToken);

          // Try to find existing user by githubId
          let user = await User.findOne({ githubId });

          if (user) {
            // Update existing user's GitHub token
            user.githubAccessToken = encryptedToken;
            user.githubUsername = githubUsername;
            await user.save();
            return done(null, user);
          }

          // Check if user exists with the same email
          if (primaryEmail) {
            user = await User.findOne({ email: primaryEmail });
            if (user) {
              // Link GitHub account to existing user
              user.githubId = githubId;
              user.githubAccessToken = encryptedToken;
              user.githubUsername = githubUsername;
              await user.save();
              return done(null, user);
            }
          }

          // Create new user from GitHub
          user = new User({
            email: primaryEmail || `${githubUsername}@github.local`,
            username: githubUsername,
            githubId,
            githubAccessToken: encryptedToken,
            githubUsername,
          });

          await user.save();
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to store in session
  passport.serializeUser((user: any, done) => {
    done(null, (user as IUser)._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

export default passport;
