const path = require("path");
const fs = require("fs");
const request = require("request");

const { createFilePath } = require("gatsby-source-filesystem");

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;

  const authorJson = require("./content/authors.json");
  const authorPage = path.resolve("./src/templates/author-page.js");

  for (let author of Object.keys(authorJson)) {

    fs.exists(`content/assets/authors/${author}.jpg`, function(exists) { 
      if (! exists) {
        let githubUsername = authorJson[author].github;
        request(`https://github.com/${githubUsername}.png?size=250`).pipe(fs.createWriteStream(`content/assets/authors/${author}.jpg`));
      } 
    }); 

    createPage({
      path: `/author/${author}`,
      component: authorPage,
      context: {
        author: author,
        limit: 10,
      },
    });
  }

  const tagTemplate = path.resolve("./src/templates/tag-page.js");
  const blogPost = path.resolve("./src/templates/blog-post.js");
  const result = await graphql(
    `
      {
        allMdx(sort: { fields: [frontmatter___date], order: DESC }) {
          edges {
            node {
              fields {
                slug
                postPath
              }
              frontmatter {
                title
                tags
              }
            }
          }
        }
        tagsGroup: allMdx(limit: 2000) {
          group(field: frontmatter___tags) {
            fieldValue
          }
        }
      }
    `
  );

  if (result.errors) {
    throw result.errors;
  }

  const posts = result.data.allMdx.edges;

  posts.forEach((post, index) => {
    const previous = index === posts.length - 1 ? null : posts[index + 1].node;
    const next = index === 0 ? null : posts[index - 1].node;

    createPage({
      path: `${post.node.fields.postPath}`,
      component: blogPost,
      context: {
        slug: post.node.fields.slug,
        postPath: post.node.fields.postPath,
        previous,
        next,
      },
    });
  });

  // Extract tag data from query
  const tags = result.data.tagsGroup.group;

  // Make tag pages
  tags.forEach(tag => {
    createPage({
      path: `/tags/${tag.fieldValue}/`,
      component: tagTemplate,
      context: {
        tag: tag.fieldValue,
      },
    });
  });

  const postsPerPage = 10;
  const numPages = Math.ceil(posts.length / postsPerPage);
  Array.from({ length: numPages }).forEach((_, index) => {
    const currentPageNumber = index + 1;
    const previousPageNumber =
      currentPageNumber === 1 ? null : currentPageNumber - 1;
    const nextPageNumber =
      currentPageNumber === numPages ? null : currentPageNumber + 1;

    createPage({
      path: `/page/${index + 1}`,
      component: path.resolve("./src/templates/blog-page.js"),
      context: {
        limit: postsPerPage,
        skip: index * postsPerPage,
        numPages,
        currentPageNumber,
        previousPageNumber,
        nextPageNumber,
      },
    });
  });
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === "Mdx") {
    const slug = createFilePath({ node, getNode });
    const date = new Date(node.frontmatter.date);
    const year = date.getFullYear();
    const zeroPaddedMonth = `${date.getMonth() + 1}`.padStart(2, "0");

    createNodeField({
      name: "slug",
      node,
      value: slug,
    });
    createNodeField({
      name: "postPath",
      node,
      value: `/${year}/${zeroPaddedMonth}${slug}`,
    });
  }
};
