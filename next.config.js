/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    '@ant-design/plots',
    '@antv/g2',
    '@antv/util',
    '@antv/component',
    'antd'
  ],
  experimental: {
    esmExternals: true,
    serverComponentsExternalPackages: ['d3-hierarchy']
  },
  webpack: (config) => {
    // 处理 ESM 模块
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false
      }
    });

    // 处理特定的 d3 和 antv 模块
    config.module.rules.push({
      test: /\.(js|mjs)$/,
      include: [
        /node_modules\/@antv/,
        /node_modules\/d3-/,
        /node_modules\/@ant-design\/plots/
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            ['@babel/plugin-transform-runtime', { regenerator: true }],
            '@babel/plugin-transform-modules-commonjs'
          ]
        }
      }
    });

    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        '.js': ['.js', '.ts', '.tsx']
      }
    };

    return config;
  }
}

module.exports = nextConfig 