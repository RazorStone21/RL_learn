# 强化学习 Resources

> 可达性在本机（2026-10）实测标注：`[✓可达]` / `[✗本机不可达]` / `[? 不稳定]`。
> 注意：本机网络是**选择性且不稳定**的，同一域名在不同时间可能结论不同（已实测到 `spinningup.openai.com`
> 先通后不通）。所以正文引用重要结论时，尽量给出**两个或以上**来源。
> 知识必须来自这里，不要凭记忆编造。每课都要引用其中的一手来源。

## Knowledge

- [Book: _Reinforcement Learning: An Introduction_ (2nd ed.) — Sutton & Barto, 2018](http://incompleteideas.net/book/RLbook2020.pdf) `[✓可达]`
  本领域的权威教科书，免费 PDF。**用途**：所有基础概念（MDP、贝尔曼方程、DP、MC、TD、n-step、函数逼近）的最终定义来源；引用时标注章节号。
- [Course: _Spinning Up in Deep RL_ — OpenAI](https://spinningup.openai.com/en/latest/) `[? 可达性不稳定]`
  深度 RL 的最佳工程入门。**用途**：策略梯度、TRPO、PPO、DDPG、TD3、SAC 的清晰推导与实现约定；术语表（Key Concepts）尤其好用。
  **注意**：本机实测该域名时通时不通（一次 HTTP 200，之后 `Could not resolve host`）。
  因此引用它的课（0017–0021）都同时给了同样可达的替代来源（Sutton &amp; Barto 对应章节、CS234、arXiv 原始论文），
  打不开时请走替代来源。
- [Course: CS234 _Reinforcement Learning_ — Stanford (Emma Brunskill)](https://web.stanford.edu/class/cs234/) `[✓可达]`
  学术严谨、讲解循序渐进。**用途**：需要更正式的推导（策略梯度定理、收敛性直觉、探索理论）时的第二来源。
- [Blog: Lilian Weng — _A (Long) Peek into Reinforcement Learning_ 及后续系列](https://lilianweng.github.io/posts/2018-02-19-rl-overview/) `[✓可达]`
  高质量综述型长文。**用途**：DQN 变体族、GAE/PPO、RLHF、探索策略等"一家之言讲清全貌"的快速定位。
- [Docs: Gymnasium](https://gymnasium.farama.org/) `[✓可达]`
  环境接口的事实标准（`reset`/`step`/`terminated`/`truncated`）。**用途**：第 0006 课把业务问题写成环境时的接口参照；理解 `Env` API 的语义细节。
- [Docs: Stable-Baselines3](https://stable-baselines3.readthedocs.io/en/master/) `[✓可达]`
  工业级算法实现与超参指南。**用途**：第 0020–0023 课的实践超参与"默认值为什么这么设"；用来对照，不替代自己实现。
- [Papers: arXiv](https://arxiv.org/abs/1707.06347) `[✓可达]`
  原始论文（PPO 1707.06347 等）。**用途**：课中给出算法原始出处时引用；也可用于加深对实现细节取舍的理解。
- [Paper: Ng, Harada & Russell (1999), _Policy Invariance under Reward Transformations_](https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf) `[✓可达]`
  势函数奖励塑形（potential-based reward shaping）的原始结论：形如
  F(s,a,s′) = γΦ(s′) − Φ(s) 的塑形项**不改变最优策略**。**用途**：第 0006 课讲奖励设计时的唯一严格依据，
  也是判断"某个塑形项会不会带偏策略"的标准工具。
- [Paper: CQL — _Conservative Q-Learning for Offline RL_ (arXiv 2006.04779)](https://arxiv.org/abs/2006.04779) `[✓可达]`
  **用途**：第 0025 课离线 RL 的保守价值估计；解释分布偏移下的外推误差为什么必须被惩罚。
- [Paper: SAC — _Soft Actor-Critic_ (arXiv 1801.01290)](https://arxiv.org/abs/1801.01290) `[✓可达]`
  **用途**：第 0023 课最大熵目标与自动温度调节的原始定义。
- [Paper: DPO — _Direct Preference Optimization_ (arXiv 2305.18290)](https://arxiv.org/abs/2305.18290) `[✓可达]`
  **用途**：第 0026 课把 RLHF 目标改写成偏好数据上的分类损失的推导。
- [Course: CS188 _Intro to AI_ — Berkeley](https://inst.eecs.berkeley.edu/~cs188/) `[✓可达]`
  MDP 与强化学习部分讲得最平易。**用途**：0003–0005 课如果卡住，用它的讲义换一种讲法。
- [Blog: Hugging Face — RLHF 系列](https://huggingface.co/blog/rlhf) `[✗本机不可达]`
  RLHF/DPO 的通俗讲解。**用途**：第 0026 课；本机不可达时改用 arXiv 原始论文与本课正文。
- [Video: David Silver — _UCL RL Course_（YouTube）](https://www.youtube.com/) `[✗本机不可达]`
  经典公开课。**用途**：本机网络封锁 YouTube，无法直接观看；如你另有网络环境可作为补充。

## Wisdom (Communities)

- [r/reinforcementlearning](https://www.reddit.com/r/reinforcementlearning/) `[✗本机不可达]`
  高信噪比、有版规治理。**用途**：把"我的建模/奖励设计/不收敛"贴出来求批评与排查思路。
- [AI Stack Exchange](https://ai.stackexchange.com/) `[?curl 403，浏览器应该可用]`
  适合问概念性、可被严谨回答的问题。**用途**：贝尔曼方程、on/off-policy、重要性采样等定义层面的困惑。
- [Stack Overflow](https://stackoverflow.com/) `[?curl 403，浏览器应该可用]`
  **用途**：实现与库的报错（numpy 广播、PyTorch 维度、Gymnasium API 变更）。
- [知乎 · 强化学习话题](https://www.zhihu.com/) `[✓可达]`
  中文社区，适合快速建立直觉与找中文复现笔记。**用途**：中文语境下的算法讲解、面试经验、工程踩坑。

## Gaps

- 本机**没有可用的视频资源**：YouTube 不可达，David Silver / CS285 等视频课无法直接观看。当前以教科书 + 文字课程补足。
- **中文一手资源薄弱**：中文内容多为二手转述，容易失真。本课程把中文只用于"讲法"，定义与公式一律回到 Sutton & Barto / Spinning Up。
- 缺少**大规模分布式 RL 工程**的高信任来源（与 mission 的 out of scope 一致，暂不补）。
- mission 的具体业务领域未定，因此**该领域的落地案例资源尚缺**；确认领域后需在此补 1–2 个垂直来源。
