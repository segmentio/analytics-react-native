module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 80],
    // Disable all the body and footer max length rules since CommitLint cannot handle multiline text in body and footer making these rules too much of a nuisance
    'body-max-length': [0, 'always'],
    'body-max-line-length': [0, 'always'],
    'footer-max-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
    // Also disable this rule since it will always complain due to the multiline incompatibility
    'footer-leading-blank': [0, 'always'],
  },
};
