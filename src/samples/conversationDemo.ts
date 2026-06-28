import type { GraphData } from '../adapters/types';

/**
 * 样例 1:一段多分支的 AI 对话,带文件引用和工具调用。
 * 节点类型:conversation / message / resource(被引用的文件) / tool_call
 * 边类型:has / replies-to / references / uses
 */
export const conversationDemo: GraphData = {
  nodes: [
    // 会话
    { id: 'conv-1', type: 'conversation', label: '重构登录模块', group: '会话' },

    // 用户消息
    { id: 'msg-u1', type: 'message', label: '帮我重构登录模块', group: '用户消息' },
    { id: 'msg-u2', type: 'message', label: '顺便加上多因素认证', group: '用户消息' },
    { id: 'msg-u3', type: 'message', label: '写个测试', group: '用户消息' },

    // AI 消息
    { id: 'msg-a1', type: 'message', label: '好的,我先看下现有代码', group: 'AI 消息' },
    { id: 'msg-a2', type: 'message', label: '重构方案已给出', group: 'AI 消息' },
    { id: 'msg-a3', type: 'message', label: 'MFA 已集成到 LoginService', group: 'AI 消息' },
    { id: 'msg-a4', type: 'message', label: '测试用例已生成', group: 'AI 消息' },

    // 资源(被引用的文件)
    { id: 'file-login', type: 'resource', label: 'src/auth/LoginService.ts', group: '文件' },
    { id: 'file-user', type: 'resource', label: 'src/auth/UserRepository.ts', group: '文件' },
    { id: 'file-mfa', type: 'resource', label: 'src/auth/MfaProvider.ts', group: '文件' },
    { id: 'file-test', type: 'resource', label: 'src/auth/__tests__/LoginService.test.ts', group: '文件' },
    { id: 'doc-owasp', type: 'resource', label: 'OWASP MFA 指南', group: '文档' },

    // 工具调用
    { id: 'tool-read1', type: 'tool_call', label: 'read_file(LoginService.ts)', group: '工具调用' },
    { id: 'tool-read2', type: 'tool_call', label: 'read_file(UserRepository.ts)', group: '工具调用' },
    { id: 'tool-write1', type: 'tool_call', label: 'edit_file(LoginService.ts)', group: '工具调用' },
    { id: 'tool-write2', type: 'tool_call', label: 'write_file(MfaProvider.ts)', group: '工具调用' },
    { id: 'tool-bash', type: 'tool_call', label: 'run_tests()', group: '工具调用' },
  ],
  edges: [
    // 会话包含
    { id: 'e1', source: 'conv-1', target: 'msg-u1', type: 'has' },
    { id: 'e2', source: 'conv-1', target: 'msg-a1', type: 'has' },
    { id: 'e3', source: 'conv-1', target: 'msg-u2', type: 'has' },
    { id: 'e4', source: 'conv-1', target: 'msg-a2', type: 'has' },
    { id: 'e5', source: 'conv-1', target: 'msg-a3', type: 'has' },
    { id: 'e6', source: 'conv-1', target: 'msg-u3', type: 'has' },
    { id: 'e7', source: 'conv-1', target: 'msg-a4', type: 'has' },

    // 消息回复链
    { id: 'e10', source: 'msg-u1', target: 'msg-a1', type: 'replies-to' },
    { id: 'e11', source: 'msg-a1', target: 'msg-u2', type: 'replies-to' },
    { id: 'e12', source: 'msg-u2', target: 'msg-a2', type: 'replies-to' },
    { id: 'e13', source: 'msg-a2', target: 'msg-u3', type: 'replies-to' },
    { id: 'e14', source: 'msg-u3', target: 'msg-a3', type: 'replies-to' },
    { id: 'e15', source: 'msg-a3', target: 'msg-a4', type: 'replies-to' },

    // 消息引用文件
    { id: 'e20', source: 'msg-u1', target: 'file-login', type: 'references' },
    { id: 'e21', source: 'msg-a1', target: 'file-login', type: 'references' },
    { id: 'e22', source: 'msg-a1', target: 'file-user', type: 'references' },
    { id: 'e23', source: 'msg-a2', target: 'file-login', type: 'references' },
    { id: 'e24', source: 'msg-a3', target: 'file-mfa', type: 'references' },
    { id: 'e25', source: 'msg-u3', target: 'file-test', type: 'references' },
    { id: 'e26', source: 'msg-a4', target: 'file-test', type: 'references' },
    { id: 'e27', source: 'msg-a2', target: 'doc-owasp', type: 'references' },

    // 工具调用关系
    { id: 'e30', source: 'msg-a1', target: 'tool-read1', type: 'uses' },
    { id: 'e31', source: 'msg-a1', target: 'tool-read2', type: 'uses' },
    { id: 'e32', source: 'msg-a2', target: 'tool-write1', type: 'uses' },
    { id: 'e33', source: 'msg-a3', target: 'tool-write2', type: 'uses' },
    { id: 'e34', source: 'msg-a4', target: 'tool-bash', type: 'uses' },

    // 工具作用对象
    { id: 'e40', source: 'tool-read1', target: 'file-login', type: 'acts-on' },
    { id: 'e41', source: 'tool-read2', target: 'file-user', type: 'acts-on' },
    { id: 'e42', source: 'tool-write1', target: 'file-login', type: 'acts-on' },
    { id: 'e43', source: 'tool-write2', target: 'file-mfa', type: 'acts-on' },
    { id: 'e44', source: 'tool-bash', target: 'file-test', type: 'acts-on' },
  ],
};
